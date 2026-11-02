using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Capacity;
using Juggle.Api.Features.Workflow;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Dashboard;

/// <summary>The team dashboard (D27), or every team's, for users who see all the work (ViewAllJobs).</summary>
public sealed class DashboardService(
    JuggleDbContext db,
    Permissions permissions,
    TeamAccess teamAccess,
    CapacityService capacity,
    JobWorkflow workflow,
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

        var openJobs = db.Jobs.Where(j => teamIds.Contains(j.TeamId) && j.Status.Kind == JobStatusKind.Open);
        var awaitingApproval = (await workflow.AwaitingApprovalAsync(ct)).ToList();
        var incoming = (await workflow.IncomingAsync(ct)).ToList();

        // Overdue (D21): required before today and still open.
        var overdueCounts = await CountByTeamAsync(openJobs.Where(j => j.RequiredDate < today || j.Deliverables.Any(d => d.DueDate < today)), ct);
        var approvalCounts = await CountByTeamAsync(openJobs.Where(j => awaitingApproval.Contains(j.StatusId)), ct);
        var incomingCounts = await CountByTeamAsync(openJobs.Where(j => incoming.Contains(j.StatusId)), ct);

        var byDepartment = await openJobs
            .GroupBy(j => j.Department.Name)
            .Select(g => new DepartmentCountDto(g.Key, g.Count()))
            .ToListAsync(ct);

        List<TeamCountDto> PerTeam(Dictionary<Guid, int> counts) =>
            teams.Select(t => new TeamCountDto(t.Id, t.Name, counts.GetValueOrDefault(t.Id))).ToList();

        return new DashboardDto(
            people,
            PerTeam(overdueCounts),
            PerTeam(approvalCounts),
            PerTeam(incomingCounts),
            byDepartment.OrderByDescending(d => d.Count).ThenBy(d => d.Department).ToList());
    }

    private static Task<Dictionary<Guid, int>> CountByTeamAsync(IQueryable<Job> jobs, CancellationToken ct) =>
        jobs.GroupBy(j => j.TeamId).ToDictionaryAsync(g => g.Key, g => g.Count(), ct);

    private static LoadDto Total(IEnumerable<DayLoad> days) =>
        days.Aggregate(new LoadDto(0, 0), (sum, day) => new LoadDto(sum.Allocated + day.Allocated, sum.Capacity + day.Capacity));
}
