using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Capacity;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Allocations;

/// <summary>
/// Books people onto projects. An allocation belongs to its project's team, so only that team's admins
/// (and Org Admins) change it. Saving never fails on a clash; the response lists the days now over capacity.
/// </summary>
public sealed class AllocationService(JuggleDbContext db, CurrentUser currentUser, TeamAccess teamAccess)
{
    private const int MaxDays = 366;

    public async Task<SavedAllocationDto> CreateAsync(SaveAllocationRequest request, CancellationToken ct)
    {
        var allocation = new Allocation { OrgId = currentUser.OrgId };
        await ApplyAsync(allocation, request, ct);
        db.Allocations.Add(allocation);
        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(allocation, ct);
    }

    public async Task<SavedAllocationDto> UpdateAsync(Guid id, SaveAllocationRequest request, CancellationToken ct)
    {
        var allocation = await FindManageableAsync(id, ct);
        await ApplyAsync(allocation, request, ct);
        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(allocation, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        db.Allocations.Remove(await FindManageableAsync(id, ct));
        await db.SaveChangesAsync(ct);
    }

    private async Task<Allocation> FindManageableAsync(Guid id, CancellationToken ct)
    {
        var allocation = await db.Allocations.Include(a => a.Project).FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new NotFoundException("Booking not found.");
        await teamAccess.EnsureCanManageAsync(allocation.Project.TeamId, ct);
        return allocation;
    }

    /// <summary>Validates the request against the project's team and copies it onto the allocation.</summary>
    private async Task ApplyAsync(Allocation allocation, SaveAllocationRequest request, CancellationToken ct)
    {
        if (request.EndDate < request.StartDate)
        {
            throw new BadRequestException("The end date must be on or after the start date.");
        }
        if (request.EndDate.DayNumber - request.StartDate.DayNumber >= MaxDays)
        {
            throw new BadRequestException("A booking can be at most a year long.");
        }

        var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == request.ProjectId, ct)
            ?? throw new BadRequestException("The project does not exist.");
        await teamAccess.EnsureCanManageAsync(project.TeamId, ct);

        if (!await db.People.AnyAsync(p => p.Id == request.PersonId && p.User.Memberships.Any(m => m.TeamId == project.TeamId), ct))
        {
            throw new BadRequestException("The person is not in this project's team.");
        }
        if (request.TaskId is { } taskId && !await db.Tasks.AnyAsync(t => t.Id == taskId && t.ProjectId == project.Id, ct))
        {
            throw new BadRequestException("The task is not in this project.");
        }

        allocation.PersonId = request.PersonId;
        allocation.ProjectId = project.Id;
        allocation.TaskId = request.TaskId;
        allocation.StartDate = request.StartDate;
        allocation.EndDate = request.EndDate;
        allocation.HoursPerDay = request.HoursPerDay;
        allocation.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
    }

    private async Task<SavedAllocationDto> ToDtoAsync(Allocation allocation, CancellationToken ct)
    {
        var days = await DayLoadsAsync(allocation, ct);
        return new(
            allocation.Id,
            allocation.PersonId,
            allocation.ProjectId,
            allocation.TaskId,
            allocation.StartDate,
            allocation.EndDate,
            allocation.HoursPerDay,
            allocation.Notes,
            days.Where(d => d.Allocated > d.Capacity).Select(d => d.Date).ToList(),
            days.Where(d => d.TimeOff is not null && !d.PublicHoliday && !d.Date.IsWeekend()).Select(d => d.Date).ToList());
    }

    /// <summary>The person's load on each of the allocation's days, with their bookings across every team.</summary>
    private async Task<IReadOnlyList<DayLoad>> DayLoadsAsync(Allocation allocation, CancellationToken ct)
    {
        var (from, to) = (allocation.StartDate, allocation.EndDate);
        var person = await db.People.AsNoTracking().FirstAsync(p => p.Id == allocation.PersonId, ct);
        var allocations = await db.Allocations
            .Where(a => a.PersonId == person.Id && a.StartDate <= to && a.EndDate >= from)
            .AsNoTracking()
            .ToListAsync(ct);
        var timeOff = await db.TimeOff
            .Where(t => t.Status == TimeOffStatus.Approved
                && (t.PersonId == null || t.PersonId == person.Id)
                && t.StartDate <= to && t.EndDate >= from)
            .AsNoTracking()
            .ToListAsync(ct);

        return Enumerable.Range(0, to.DayNumber - from.DayNumber + 1)
            .Select(from.AddDays)
            .Select(date => CapacityCalculator.ForDay(person, date, allocations, timeOff))
            .ToList();
    }
}
