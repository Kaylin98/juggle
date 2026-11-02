using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Capacity;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Allocations;

/// <summary>
/// Books people onto jobs. An allocation belongs to its job's team, so only users who may book work (Allocate)
/// in that team change it. Saving never fails on a clash; the response lists the days now over capacity.
/// </summary>
public sealed class AllocationService(JuggleDbContext db, CurrentUser currentUser, TeamAccess teamAccess, AllocationChecks checks, OrgClock clock)
{
    private const int MaxDays = 366;

    /// <summary>
    /// A booking made from the schedule follows the job's rules: only a job still in Incoming or In Design, and only for
    /// its designer. An unallocated job is booked through Allocate and schedule, which also moves its status.
    /// </summary>
    public async Task<SavedAllocationDto> BookAsync(SaveAllocationRequest request, CancellationToken ct)
    {
        var job = await db.Jobs.Include(j => j.Status).ThenInclude(s => s.Column).FirstOrDefaultAsync(j => j.Id == request.JobId, ct)
            ?? throw new BadRequestException("The job does not exist.");
        await teamAccess.EnsureAsync(job.TeamId, Capability.Allocate, ct);
        if (job.Status.Kind != JobStatusKind.Open || job.Status.Column.Order >= Jobs.JobDto.BookableColumns)
        {
            throw new BadRequestException("This job is no longer being worked on, so it can't be booked.");
        }
        if (job.DesignerPersonId is null)
        {
            throw new BadRequestException("Allocate and schedule this job before booking it.");
        }
        if (job.DesignerPersonId != request.PersonId)
        {
            throw new BadRequestException("This job is allocated to someone else.");
        }

        return await CreateAsync(request, ct);
    }

    public async Task<SavedAllocationDto> CreateAsync(SaveAllocationRequest request, CancellationToken ct)
    {
        var allocation = new Allocation { OrgId = currentUser.OrgId };
        var job = await ApplyAsync(allocation, request, ct);
        db.Allocations.Add(allocation);
        job.DesignerPersonId ??= allocation.PersonId;
        await db.SaveChangesAsync(ct);
        await SyncJobDatesAsync(job, ct);
        return await ToDtoAsync(allocation, ct);
    }

    /// <summary>
    /// Saves the booking. Moving it to another person reassigns the job when that person was its designer, and moving
    /// its dates reschedules it; both are logged on the job (D72).
    /// </summary>
    public async Task<SavedAllocationDto> UpdateAsync(Guid id, SaveAllocationRequest request, CancellationToken ct)
    {
        var allocation = await FindManageableAsync(id, ct);
        var (person, start, end) = (allocation.PersonId, allocation.StartDate, allocation.EndDate);
        var job = await ApplyAsync(allocation, request, ct);
        if (allocation.PersonId != person && job.DesignerPersonId == person)
        {
            job.DesignerPersonId = allocation.PersonId;
            var name = await db.People.Where(p => p.Id == allocation.PersonId).Select(p => p.User.Name).FirstAsync(ct);
            LogEvent(job, WorkflowAction.Reassign, $"Reassigned to {name}");
        }
        if (allocation.StartDate != start || allocation.EndDate != end)
        {
            LogEvent(job, WorkflowAction.Reschedule, $"Booked {allocation.StartDate:d MMM} to {allocation.EndDate:d MMM}");
        }

        await db.SaveChangesAsync(ct);
        await SyncJobDatesAsync(job, ct);
        return await ToDtoAsync(allocation, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        var allocation = await FindManageableAsync(id, ct);
        db.Allocations.Remove(allocation);
        await db.SaveChangesAsync(ct);
        await SyncJobDatesAsync(allocation.Job, ct);
    }

    /// <summary>A job starts with its first booking and is expected to finish with its last.</summary>
    private async Task SyncJobDatesAsync(Job job, CancellationToken ct)
    {
        var bookings = await db.Allocations.Where(a => a.JobId == job.Id).Select(a => new { a.StartDate, a.EndDate }).ToListAsync(ct);
        job.PlannedStartDate = bookings.Count == 0 ? null : bookings.Min(b => b.StartDate);
        job.ExpectedCompletionDate = bookings.Count == 0 ? null : bookings.Max(b => b.EndDate);
        await db.SaveChangesAsync(ct);
    }

    private void LogEvent(Job job, WorkflowAction action, string message) =>
        db.JobEvents.Add(new JobEvent
        {
            OrgId = job.OrgId,
            JobId = job.Id,
            UserId = currentUser.UserId,
            At = clock.Now,
            Action = action,
            FromStatusId = job.StatusId,
            ToStatusId = job.StatusId,
            Message = message,
        });

    private async Task<Allocation> FindManageableAsync(Guid id, CancellationToken ct)
    {
        var allocation = await db.Allocations.Include(a => a.Job).FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new NotFoundException("Booking not found.");
        await teamAccess.EnsureAsync(allocation.Job.TeamId, Capability.Allocate, ct);
        return allocation;
    }

    /// <summary>Validates the request against the job's team and copies it onto the allocation.</summary>
    private async Task<Job> ApplyAsync(Allocation allocation, SaveAllocationRequest request, CancellationToken ct)
    {
        if (request.EndDate < request.StartDate)
        {
            throw new BadRequestException("The end date must be on or after the start date.");
        }
        if (request.EndDate.DayNumber - request.StartDate.DayNumber >= MaxDays)
        {
            throw new BadRequestException("A booking can be at most a year long.");
        }

        var job = await db.Jobs.FirstOrDefaultAsync(j => j.Id == request.JobId, ct)
            ?? throw new BadRequestException("The job does not exist.");
        await teamAccess.EnsureAsync(job.TeamId, Capability.Allocate, ct);

        if (!await db.People.AnyAsync(p => p.Id == request.PersonId && p.User.Memberships.Any(m => m.TeamId == job.TeamId), ct))
        {
            throw new BadRequestException("The person is not in this job's team.");
        }

        allocation.PersonId = request.PersonId;
        allocation.JobId = job.Id;
        allocation.StartDate = request.StartDate;
        allocation.EndDate = request.EndDate;
        allocation.HoursPerDay = request.HoursPerDay;
        allocation.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        return job;
    }

    private async Task<SavedAllocationDto> ToDtoAsync(Allocation allocation, CancellationToken ct)
    {
        var days = await checks.DayLoadsAsync(allocation.PersonId, allocation.StartDate, allocation.EndDate, null, ct);
        return new(
            allocation.Id,
            allocation.PersonId,
            allocation.JobId,
            allocation.StartDate,
            allocation.EndDate,
            allocation.HoursPerDay,
            allocation.Notes,
            days.Where(d => d.Allocated > d.Capacity).Select(d => d.Date).ToList(),
            days.Where(d => d.TimeOff is not null && !d.PublicHoliday && !d.Date.IsWeekend()).Select(d => d.Date).ToList());
    }

}
