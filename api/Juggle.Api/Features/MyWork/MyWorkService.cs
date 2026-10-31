using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Capacity;
using Juggle.Api.Features.Tasks;
using Juggle.Api.Features.Teams;
using Juggle.Api.Features.TimeOffRequests;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.MyWork;

/// <summary>My work: the signed-in person's tasks, schedule and leave across every team they are in, ignoring the team switcher.</summary>
public sealed class MyWorkService(JuggleDbContext db, CurrentUser currentUser, OrgClock clock)
{
    /// <summary>This week and next week.</summary>
    private const int Weeks = 2;

    public async Task<MyWorkDto> GetAsync(CancellationToken ct)
    {
        var person = await db.People.Include(p => p.User).AsNoTracking().FirstOrDefaultAsync(p => p.UserId == currentUser.UserId, ct)
            ?? throw new ForbiddenException("My work is for team members.");

        var today = clock.Today;
        var from = today.StartOfWeek();
        var to = from.AddDays((Weeks * 7) - 1);
        var teamNames = await db.Teams.ToDictionaryAsync(t => t.Id, t => t.Name, ct);

        var tasks = await db.Tasks
            .Include(t => t.Status)
            .Include(t => t.Project).ThenInclude(p => p.Department)
            .Where(t => t.AssigneePersonId == person.Id
                && t.Status.Category != StatusCategory.Done
                // The first status, Triage, is not a board column (D18).
                && db.WorkflowStatuses.Any(s => s.TeamId == t.TeamId && s.Order < t.Status.Order)
                && (currentUser.IsOrgAdmin || db.TeamMemberships.Any(m => m.TeamId == t.TeamId && m.UserId == currentUser.UserId)))
            .AsNoTracking()
            .ToListAsync(ct);

        var bookings = await db.Allocations
            .Include(a => a.Project).ThenInclude(p => p.Department)
            .Where(a => a.PersonId == person.Id && a.StartDate <= to && a.EndDate >= from)
            .OrderBy(a => a.StartDate)
            .ThenBy(a => a.Project.Name)
            .AsNoTracking()
            .ToListAsync(ct);

        // Their leave (not cancelled) and the public holidays, from this week on: for the schedule, which shows
        // approved and pending leave, the list, which adds declined requests and their reasons, and to count working days.
        var timeOff = await db.TimeOff
            .Where(t => ((t.PersonId == null && t.Status == TimeOffStatus.Approved)
                    || (t.PersonId == person.Id && t.Status != TimeOffStatus.Cancelled))
                && t.EndDate >= from)
            .OrderBy(t => t.StartDate)
            .AsNoTracking()
            .ToListAsync(ct);
        var holidays = timeOff.Where(t => t.PersonId == null).Select(t => t.StartDate).ToHashSet();

        return new MyWorkDto(
            new PersonDto(person.Id, person.User.Name, person.User.AvatarColour, person.JobTitle, person.HoursPerDay),
            tasks
                .Select(t => new MyTaskDto(
                    TaskDto.From(t, today),
                    t.TeamId,
                    teamNames[t.TeamId],
                    t.Project.Name,
                    t.Project.Colour,
                    t.Project.Department.Name,
                    t.Status.Name,
                    t.Status.Category))
                .OrderByDescending(t => t.Task.IsOverdue)
                .ThenBy(t => t.Task.DueDate ?? DateOnly.MaxValue)
                .ThenBy(t => t.Task.Title)
                .ToList(),
            Enumerable.Range(0, Weeks * 7)
                .Select(from.AddDays)
                .Where(d => !d.IsWeekend())
                .Select(d => CapacityCalculator.ForDay(person, d, bookings, timeOff))
                .ToList(),
            bookings.Select(a => AllocationDto.From(a, teamNames[a.Project.TeamId], false)).ToList(),
            timeOff
                .Where(t => t.PersonId == person.Id && t.EndDate >= today)
                .Select(t => MyTimeOffDto.From(t, holidays))
                .ToList());
    }
}
