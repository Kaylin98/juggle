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
    /// its designer. An unallocated job is booked through Allocate and schedule, which also moves its status. Time added
    /// on days the designer is already booked on the job adds to that booking's hours rather than overlapping it.
    /// </summary>
    public async Task<SavedAllocationDto> BookAsync(SaveAllocationRequest request, CancellationToken ct)
    {
        var job = await LoadBookableJobAsync(request.JobId, request.PersonId, ct);
        var overlapping = await db.Allocations
            .Where(a => a.JobId == job.Id && a.PersonId == request.PersonId && a.StartDate <= request.EndDate && a.EndDate >= request.StartDate)
            .OrderBy(a => a.StartDate)
            .ToListAsync(ct);
        return overlapping.Count == 0 ? await CreateAsync(request, ct) : await ExtendAsync(job, overlapping, request, ct);
    }

    /// <summary>
    /// Moves the job to another designer, with all its bookings: for users who may book work, while the job is still being
    /// worked on. It is logged on the job (D78); a booking is never moved to someone else on its own.
    /// </summary>
    public async Task<ReassignedJobDto> ReassignAsync(Guid jobId, ReassignRequest request, CancellationToken ct)
    {
        var job = await db.Jobs.Include(j => j.Status).ThenInclude(s => s.Column).FirstOrDefaultAsync(j => j.Id == jobId, ct)
            ?? throw new NotFoundException("Job not found.");
        await teamAccess.EnsureAsync(job.TeamId, Capability.Allocate, ct);
        EnsureBeingWorkedOn(job);
        if (job.DesignerPersonId is not { } from)
        {
            throw new BadRequestException("Allocate and schedule this job before reassigning it.");
        }
        if (from == request.PersonId)
        {
            throw new BadRequestException("The job is already allocated to that person.");
        }

        var target = await db.People.Include(p => p.User)
            .FirstOrDefaultAsync(p => p.Id == request.PersonId && p.User.Memberships.Any(m => m.TeamId == job.TeamId), ct)
            ?? throw new BadRequestException("The person is not in this job's team.");
        var fromName = await db.People.Where(p => p.Id == from).Select(p => p.User.Name).FirstAsync(ct);
        var bookings = await db.Allocations.Where(a => a.JobId == jobId).ToListAsync(ct);
        foreach (var booking in bookings)
        {
            booking.PersonId = target.Id;
        }
        foreach (var revision in await db.JobRevisions.Where(r => r.JobId == jobId && r.CompletedAt == null).ToListAsync(ct))
        {
            revision.DesignerPersonId = target.Id;
        }

        job.DesignerPersonId = target.Id;
        LogEvent(job, WorkflowAction.Reassign, $"Reassigned from {fromName} to {target.User.Name}");
        await db.SaveChangesAsync(ct);

        var clash = new SortedSet<DateOnly>();
        var leave = new SortedSet<DateOnly>();
        foreach (var booking in bookings)
        {
            var days = await checks.DayLoadsAsync(target.Id, booking.StartDate, booking.EndDate, null, ct);
            clash.UnionWith(days.Where(d => d.Allocated > d.Capacity).Select(d => d.Date));
            leave.UnionWith(days.Where(d => d.TimeOff is not null && !d.PublicHoliday && !d.Date.IsWeekend()).Select(d => d.Date));
        }

        return new ReassignedJobDto([.. clash], [.. leave]);
    }

    /// <summary>The job, if the user may book work in its team and it can be booked for the person: its designer.</summary>
    private async Task<Job> LoadBookableJobAsync(Guid jobId, Guid personId, CancellationToken ct)
    {
        var job = await db.Jobs.Include(j => j.Status).ThenInclude(s => s.Column).FirstOrDefaultAsync(j => j.Id == jobId, ct)
            ?? throw new BadRequestException("The job does not exist.");
        await teamAccess.EnsureAsync(job.TeamId, Capability.Allocate, ct);
        EnsureBeingWorkedOn(job);
        if (job.DesignerPersonId is null)
        {
            throw new BadRequestException("Allocate and schedule this job before booking it.");
        }
        if (job.DesignerPersonId != personId)
        {
            throw new BadRequestException("This job is allocated to someone else. Reassign it to move its bookings.");
        }

        return job;
    }

    private static void EnsureBeingWorkedOn(Job job)
    {
        if (job.Status.Kind != JobStatusKind.Open || job.Status.Column.Order >= Jobs.JobDto.BookableColumns)
        {
            throw new BadRequestException("This job is no longer being worked on, so it can't be booked.");
        }
    }

    /// <summary>
    /// Adds the request's hours to the days the person is already booked on the job, splitting the bookings where the
    /// hours change, so the job never has two bookings on one day for one person.
    /// </summary>
    private async Task<SavedAllocationDto> ExtendAsync(Job job, List<Allocation> existing, SaveAllocationRequest request, CancellationToken ct)
    {
        CheckDates(request);
        var hours = new SortedDictionary<DateOnly, decimal>();
        void Add(DateOnly from, DateOnly to, decimal perDay)
        {
            for (var day = from; day <= to; day = day.AddDays(1))
            {
                if (!day.IsWeekend())
                {
                    hours[day] = hours.GetValueOrDefault(day) + perDay;
                }
            }
        }

        foreach (var booking in existing)
        {
            Add(booking.StartDate, booking.EndDate, booking.HoursPerDay);
        }
        Add(request.StartDate, request.EndDate, request.HoursPerDay);

        var notes = existing.Select(a => a.Notes).FirstOrDefault(n => n is not null) ?? (string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim());
        db.Allocations.RemoveRange(existing);
        var segments = new List<Allocation>();
        foreach (var (day, perDay) in hours)
        {
            if (segments.Count > 0 && segments[^1].HoursPerDay == perDay && NextWeekday(segments[^1].EndDate) == day)
            {
                segments[^1].EndDate = day;
            }
            else
            {
                segments.Add(new Allocation
                {
                    OrgId = currentUser.OrgId, PersonId = request.PersonId, JobId = job.Id,
                    StartDate = day, EndDate = day, HoursPerDay = perDay, Notes = segments.Count == 0 ? notes : null,
                });
            }
        }

        db.Allocations.AddRange(segments);
        await db.SaveChangesAsync(ct);
        await SyncJobDatesAsync(job, ct);

        var days = await checks.DayLoadsAsync(request.PersonId, request.StartDate, request.EndDate, null, ct);
        var shown = segments.FirstOrDefault(s => s.EndDate >= request.StartDate) ?? segments[0];
        return new(
            shown.Id, shown.PersonId, shown.JobId, shown.StartDate, shown.EndDate, shown.HoursPerDay, shown.Notes,
            days.Where(d => d.Allocated > d.Capacity).Select(d => d.Date).ToList(),
            days.Where(d => d.TimeOff is not null && !d.PublicHoliday && !d.Date.IsWeekend()).Select(d => d.Date).ToList());
    }

    private static DateOnly NextWeekday(DateOnly date) => date.AddDays(date.DayOfWeek == DayOfWeek.Friday ? 3 : 1);

    private static void CheckDates(SaveAllocationRequest request)
    {
        if (request.EndDate < request.StartDate)
        {
            throw new BadRequestException("The end date must be on or after the start date.");
        }
        if (request.EndDate.DayNumber - request.StartDate.DayNumber >= MaxDays)
        {
            throw new BadRequestException("A booking can be at most a year long.");
        }
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
    /// Saves the booking: its days, hours and notes, or the job it is for. It stays with the same person, who must be the
    /// job's designer; moving a job to someone else is a reassignment (<see cref="ReassignAsync"/>). Moving its dates
    /// reschedules the job, logged on it (D72).
    /// </summary>
    public async Task<SavedAllocationDto> UpdateAsync(Guid id, SaveAllocationRequest request, CancellationToken ct)
    {
        var allocation = await FindManageableAsync(id, ct);
        if (request.PersonId != allocation.PersonId)
        {
            throw new BadRequestException("A booking stays with its designer. Reassign the job to move its bookings to someone else.");
        }
        if (request.JobId != allocation.JobId)
        {
            await LoadBookableJobAsync(request.JobId, request.PersonId, ct);
        }

        var (start, end) = (allocation.StartDate, allocation.EndDate);
        var job = await ApplyAsync(allocation, request, ct);
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
        CheckDates(request);
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
