using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Capacity;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Allocations;

/// <summary>
/// What a booking would run into, worked out before it is saved: over-capacity days, leave, the job's deadline, and
/// how free each designer is. Nothing here saves; the user decides whether to book anyway (D16).
/// </summary>
public sealed class AllocationChecks(JuggleDbContext db, TeamAccess teamAccess)
{
    private const int MaxDays = 366;

    /// <summary>The person's load on each day from the start to the end date, across every team, leaving out one booking.</summary>
    public async Task<IReadOnlyList<DayLoad>> DayLoadsAsync(Guid personId, DateOnly from, DateOnly to, Guid? exceptAllocationId, CancellationToken ct)
    {
        var person = await db.People.AsNoTracking().FirstAsync(p => p.Id == personId, ct);
        var allocations = await db.Allocations
            .Where(a => a.PersonId == personId && a.Id != exceptAllocationId && a.StartDate <= to && a.EndDate >= from)
            .AsNoTracking()
            .ToListAsync(ct);
        var timeOff = await db.TimeOff
            .Where(t => t.Status == TimeOffStatus.Approved
                && (t.PersonId == null || t.PersonId == personId)
                && t.StartDate <= to && t.EndDate >= from)
            .AsNoTracking()
            .ToListAsync(ct);

        return Enumerable.Range(0, to.DayNumber - from.DayNumber + 1)
            .Select(from.AddDays)
            .Select(date => CapacityCalculator.ForDay(person, date, allocations, timeOff))
            .ToList();
    }

    public async Task<AllocationCheckDto> CheckAsync(AllocationCheckQuery query, CancellationToken ct)
    {
        EnsureRange(query.StartDate, query.EndDate);
        var job = await db.Jobs.Include(j => j.Deliverables).AsNoTracking().FirstOrDefaultAsync(j => j.Id == query.JobId, ct)
            ?? throw new NotFoundException("Job not found.");
        await teamAccess.EnsureAsync(job.TeamId, Capability.Allocate, ct);

        var deadline = job.Deadline;
        var through = deadline is { } d && d > query.EndDate && d.DayNumber - query.StartDate.DayNumber < MaxDays ? d : query.EndDate;
        var days = await DayLoadsAsync(query.PersonId, query.StartDate, through, query.ExceptAllocationId, ct);
        var booked = days.Where(d => d.Date <= query.EndDate).ToList();

        return new(
            booked.Where(d => d.Capacity > 0 && d.Allocated + query.HoursPerDay > d.Capacity).Select(d => d.Date).ToList(),
            booked.Where(d => d.TimeOff is not null && !d.PublicHoliday && !d.Date.IsWeekend()).Select(d => d.Date).ToList(),
            deadline,
            deadline is { } due ? booked.Count(d => d.Capacity > 0 && d.Date > due) : 0,
            deadline is { } by && by >= query.StartDate ? days.Count(d => d.Capacity > 0 && d.Date <= by) : 0);
    }

    /// <summary>The hours each person in the team has free over the days: their capacity less their bookings, never below zero a day.</summary>
    public async Task<IReadOnlyList<PersonAvailabilityDto>> AvailabilityAsync(Guid teamId, DateOnly from, DateOnly to, CancellationToken ct)
    {
        EnsureRange(from, to);
        await teamAccess.EnsureAsync(teamId, Capability.Allocate, ct);
        var people = await db.People
            .Where(p => p.User.Memberships.Any(m => m.TeamId == teamId))
            .AsNoTracking()
            .ToListAsync(ct);
        var ids = people.Select(p => p.Id).ToList();
        var allocations = await db.Allocations
            .Where(a => ids.Contains(a.PersonId) && a.StartDate <= to && a.EndDate >= from)
            .AsNoTracking()
            .ToListAsync(ct);
        var timeOff = await db.TimeOff
            .Where(t => t.Status == TimeOffStatus.Approved
                && (t.PersonId == null || ids.Contains(t.PersonId.Value))
                && t.StartDate <= to && t.EndDate >= from)
            .AsNoTracking()
            .ToListAsync(ct);

        return people
            .Select(person =>
            {
                var theirs = allocations.Where(a => a.PersonId == person.Id).ToList();
                var leave = timeOff.Where(t => t.PersonId == null || t.PersonId == person.Id).ToList();
                var free = Enumerable.Range(0, to.DayNumber - from.DayNumber + 1)
                    .Select(from.AddDays)
                    .Select(date => CapacityCalculator.ForDay(person, date, theirs, leave))
                    .Sum(d => Math.Max(0, d.Capacity - d.Allocated));
                return new PersonAvailabilityDto(person.Id, free);
            })
            .ToList();
    }

    private static void EnsureRange(DateOnly from, DateOnly to)
    {
        if (to < from)
        {
            throw new BadRequestException("The end date must be on or after the start date.");
        }
        if (to.DayNumber - from.DayNumber >= MaxDays)
        {
            throw new BadRequestException("A booking can be at most a year long.");
        }
    }
}
