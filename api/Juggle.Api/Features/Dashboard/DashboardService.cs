using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Capacity;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Dashboard;

/// <summary>The team dashboard (D27), or every team's, for users who see all the work (ViewAllJobs).</summary>
public sealed class DashboardService(
    JuggleDbContext db,
    Permissions permissions,
    TeamAccess teamAccess,
    CapacityService capacity,
    OrgClock clock)
{
    /// <summary>This week and the next four.</summary>
    private const int Weeks = 5;

    public async Task<DashboardDto> GetAsync(Guid? teamId, CancellationToken ct)
    {
        if (teamId is { } id)
        {
            await teamAccess.EnsureAsync(id, Capability.ViewAllJobs, ct);
        }
        else
        {
            await permissions.EnsureAsync(Capability.ViewAllJobs, ct);
        }

        var today = clock.Today;
        var teams = await db.Teams
            .Where(t => teamId == null || t.Id == teamId)
            .OrderBy(t => t.Name)
            .Select(t => new { t.Id, t.Name })
            .ToListAsync(ct);
        var teamIds = teams.Select(t => t.Id).ToList();

        // Same rules as the schedule, so the two always agree: leave, holidays and other teams' bookings count.
        var schedule = await capacity.GetAsync(teamId, today, Weeks, ct);
        var nextWeek = today.StartOfWeek().AddDays(7);
        var people = schedule.People.Select(p =>
        {
            var thisWeek = p.Days.Where(d => d.Date < nextWeek).ToList();
            return new PersonUtilisationDto(
                p.Id,
                p.Name,
                p.AvatarColour,
                p.JobTitle,
                Total(thisWeek),
                Total(p.Days.Where(d => d.Date >= nextWeek)),
                thisWeek.Any(d => d.Allocated > d.Capacity));
        }).ToList();

        var openTasks = db.Tasks.Where(t => teamIds.Contains(t.TeamId) && t.Status.Category != StatusCategory.Done);

        // Overdue (D21): due before today and not done.
        var overdue = await openTasks
            .Where(t => t.DueDate < today)
            .GroupBy(t => t.TeamId)
            .ToDictionaryAsync(g => g.Key, g => g.Count(), ct);

        // Awaiting review (D53): sitting in a review column, waiting on feedback or approval.
        var awaitingReview = await openTasks
            .Where(t => t.Status.Category == StatusCategory.Review)
            .GroupBy(t => t.TeamId)
            .ToDictionaryAsync(g => g.Key, g => g.Count(), ct);

        var triage = await db.Requests
            .Where(r => teamIds.Contains(r.TeamId) && r.Status == RequestStatus.New)
            .GroupBy(r => r.TeamId)
            .ToDictionaryAsync(g => g.Key, g => g.Count(), ct);

        var byDepartment = await openTasks
            .GroupBy(t => t.Project.Department.Name)
            .Select(g => new DepartmentCountDto(g.Key, g.Count()))
            .ToListAsync(ct);

        return new DashboardDto(
            people,
            teams.Select(t => new TeamCountDto(t.Id, t.Name, overdue.GetValueOrDefault(t.Id))).ToList(),
            teams.Select(t => new TeamCountDto(t.Id, t.Name, awaitingReview.GetValueOrDefault(t.Id))).ToList(),
            teams.Select(t => new TeamCountDto(t.Id, t.Name, triage.GetValueOrDefault(t.Id))).ToList(),
            byDepartment.OrderByDescending(d => d.Count).ThenBy(d => d.Department).ToList());
    }

    private static LoadDto Total(IEnumerable<DayLoad> days) =>
        days.Aggregate(new LoadDto(0, 0), (sum, day) => new LoadDto(sum.Allocated + day.Allocated, sum.Capacity + day.Capacity));
}
