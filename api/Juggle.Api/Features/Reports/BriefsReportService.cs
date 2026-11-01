using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Reports;

/// <summary>
/// The briefs report (D56), like the studio's Monday report: the board's cards by status and by assignee, and the
/// briefs received each month, for every brand or one. It covers the whole team, so it needs ViewAllJobs too until
/// reports are scoped to the viewer (V.6).
/// </summary>
public sealed class BriefsReportService(JuggleDbContext db, TeamAccess teamAccess, Permissions permissions, OrgClock clock)
{
    /// <summary>This month and the eight before it.</summary>
    public const int Months = 9;

    public async Task<BriefsReportDto> GetAsync(Guid teamId, Guid? departmentId, CancellationToken ct)
    {
        await teamAccess.EnsureAsync(teamId, Capability.ViewReports, ct);
        await permissions.EnsureAsync(Capability.ViewAllJobs, ct);

        var brands = await db.Departments
            .Where(d => db.Projects.Any(p => p.TeamId == teamId && p.DepartmentId == d.Id)
                || db.Requests.Any(r => r.TeamId == teamId && r.DepartmentId == d.Id))
            .OrderBy(d => d.Name)
            .Select(d => new BrandDto(d.Id, d.Name))
            .ToListAsync(ct);

        // The first status, Triage, is the inbox rather than a board column (D18).
        var statuses = await db.WorkflowStatuses.Where(s => s.TeamId == teamId).OrderBy(s => s.Order).Skip(1).ToListAsync(ct);
        var counts = (await db.Tasks
                .Where(t => t.TeamId == teamId && (departmentId == null || t.Project.DepartmentId == departmentId))
                .GroupBy(t => new { t.StatusId, t.AssigneePersonId })
                .Select(g => new { g.Key.StatusId, g.Key.AssigneePersonId, Count = g.Count() })
                .ToListAsync(ct))
            .Where(c => statuses.Any(s => s.Id == c.StatusId))
            .ToList();

        var assigneeIds = counts.Where(c => c.AssigneePersonId != null).Select(c => c.AssigneePersonId!.Value).Distinct().ToList();
        var people = await db.People
            .Where(p => p.User.Memberships.Any(m => m.TeamId == teamId) || assigneeIds.Contains(p.Id))
            .OrderBy(p => p.User.Name)
            .Select(p => new { p.Id, p.User.Name })
            .ToListAsync(ct);

        var done = statuses.Where(s => s.Category == StatusCategory.Done).Select(s => s.Id).ToHashSet();
        DesignerCountDto Designer(Guid? personId, string? name) => new(
            personId,
            name,
            counts.Where(c => c.AssigneePersonId == personId).ToDictionary(c => c.StatusId, c => c.Count));
        int Open(DesignerCountDto designer) => designer.Counts.Where(c => !done.Contains(c.Key)).Sum(c => c.Value);

        var byDesigner = people
            .Select(p => Designer(p.Id, p.Name))
            .OrderByDescending(Open)
            .ThenBy(d => d.Name)
            .ToList();
        if (counts.Any(c => c.AssigneePersonId == null))
        {
            byDesigner.Add(Designer(null, null));
        }

        return new BriefsReportDto(
            brands,
            statuses.Select(s => new StatusCountDto(s.Id, s.Name, s.Category, counts.Where(c => c.StatusId == s.Id).Sum(c => c.Count))).ToList(),
            byDesigner,
            await ReceivedByMonthAsync(teamId, departmentId, ct));
    }

    /// <summary>Counted by the day each request was sent in the organisation's time zone, whatever became of it.</summary>
    private async Task<IReadOnlyList<MonthCountDto>> ReceivedByMonthAsync(Guid teamId, Guid? departmentId, CancellationToken ct)
    {
        var today = clock.Today;
        var firstMonth = new DateOnly(today.Year, today.Month, 1).AddMonths(-(Months - 1));
        // A day early in UTC, so nothing sent just after midnight in Johannesburg is missed; the dates sort it out.
        var since = new DateTimeOffset(firstMonth.AddDays(-1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);

        var sent = await db.Requests
            .Where(r => r.TeamId == teamId && (departmentId == null || r.DepartmentId == departmentId) && r.CreatedAt >= since)
            .Select(r => r.CreatedAt)
            .ToListAsync(ct);
        var perMonth = sent
            .Select(OrgClock.DateOf)
            .Where(d => d >= firstMonth)
            .CountBy(d => new DateOnly(d.Year, d.Month, 1))
            .ToDictionary();

        return Enumerable.Range(0, Months)
            .Select(i => firstMonth.AddMonths(i))
            .Select(month => new MonthCountDto(month, perMonth.GetValueOrDefault(month)))
            .ToList();
    }
}
