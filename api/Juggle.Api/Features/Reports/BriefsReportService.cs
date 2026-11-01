using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Reports;

/// <summary>
/// The briefs report (D56), like the studio's Monday report: the team's jobs by board column and by designer, and the
/// briefs received each month, for every brand or one. It covers the whole team, so it needs ViewAllJobs too until
/// reports are scoped to the viewer (V.6). A column whose statuses are all done or cancelled counts as completed.
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
            .Where(d => db.Jobs.Any(j => j.TeamId == teamId && j.DepartmentId == d.Id))
            .OrderBy(d => d.Name)
            .Select(d => new BrandDto(d.Id, d.Name))
            .ToListAsync(ct);

        var columns = await db.BoardColumns.OrderBy(c => c.Order).ToListAsync(ct);
        var statuses = await db.JobStatuses.ToListAsync(ct);
        var doneColumns = columns
            .Where(c => statuses.Where(s => s.ColumnId == c.Id).All(s => s.Kind != JobStatusKind.Open))
            .Select(c => c.Id)
            .ToHashSet();

        var counts = await db.Jobs
            .Where(j => j.TeamId == teamId
                && j.Status.Kind != JobStatusKind.Cancelled
                && (departmentId == null || j.DepartmentId == departmentId))
            .GroupBy(j => new { j.Status.ColumnId, j.DesignerPersonId })
            .Select(g => new { g.Key.ColumnId, g.Key.DesignerPersonId, Count = g.Count() })
            .ToListAsync(ct);

        var designerIds = counts.Where(c => c.DesignerPersonId != null).Select(c => c.DesignerPersonId!.Value).Distinct().ToList();
        var people = await db.People
            .Where(p => p.User.Memberships.Any(m => m.TeamId == teamId) || designerIds.Contains(p.Id))
            .OrderBy(p => p.User.Name)
            .Select(p => new { p.Id, p.User.Name })
            .ToListAsync(ct);

        DesignerCountDto Designer(Guid? personId, string? name) => new(
            personId,
            name,
            counts.Where(c => c.DesignerPersonId == personId).ToDictionary(c => c.ColumnId, c => c.Count));
        int Open(DesignerCountDto designer) => designer.Counts.Where(c => !doneColumns.Contains(c.Key)).Sum(c => c.Value);

        var byDesigner = people
            .Select(p => Designer(p.Id, p.Name))
            .OrderByDescending(Open)
            .ThenBy(d => d.Name)
            .ToList();
        if (counts.Any(c => c.DesignerPersonId == null))
        {
            byDesigner.Add(Designer(null, null));
        }

        return new BriefsReportDto(
            brands,
            columns
                .Select(c => new ColumnCountDto(c.Id, c.Name, doneColumns.Contains(c.Id), counts.Where(n => n.ColumnId == c.Id).Sum(n => n.Count)))
                .ToList(),
            byDesigner,
            await ReceivedByMonthAsync(teamId, departmentId, ct));
    }

    /// <summary>Counted by the day each brief was sent in the organisation's time zone, whatever became of it.</summary>
    private async Task<IReadOnlyList<MonthCountDto>> ReceivedByMonthAsync(Guid teamId, Guid? departmentId, CancellationToken ct)
    {
        var today = clock.Today;
        var firstMonth = new DateOnly(today.Year, today.Month, 1).AddMonths(-(Months - 1));
        // A day early in UTC, so nothing sent just after midnight in Johannesburg is missed; the dates sort it out.
        var since = new DateTimeOffset(firstMonth.AddDays(-1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);

        var sent = await db.Jobs
            .Where(j => j.TeamId == teamId && (departmentId == null || j.DepartmentId == departmentId) && j.CreatedAt >= since)
            .Select(j => j.CreatedAt)
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
