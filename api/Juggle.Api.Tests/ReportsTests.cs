using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Jobs;
using Juggle.Api.Features.Reports;
using Juggle.Api.Features.Teams;

namespace Juggle.Api.Tests;

// Compares against the live board, which other test classes change, so these run on their own.
[Collection(typeof(RunsAlone))]
public sealed class ReportsTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;

    [Fact]
    public async Task Column_and_designer_counts_match_the_board_without_cancelled_jobs()
    {
        var client = await api.SignInAsAsync("Naledi Khumalo");
        var studioId = await GetTeamIdAsync(client, "Design Studio");
        var jobs = (await client.GetFromJsonAsync<List<JobDto>>($"/api/teams/{studioId}/jobs", ApiFactory.Json, _ct))!
            .Where(j => j.StatusKind != JobStatusKind.Cancelled)
            .ToList();
        var people = (await client.GetFromJsonAsync<List<PersonDto>>($"/api/teams/{studioId}/people", ApiFactory.Json, _ct))!;

        var report = await GetReportAsync(client, studioId);

        Assert.Equal(["Incoming", "In Design", "In Review", "With Marketing", "Done"], report.ByColumn.Select(c => c.Name));
        Assert.Equal([false, false, false, false, true], report.ByColumn.Select(c => c.Done));
        Assert.All(report.ByColumn, c => Assert.Equal(jobs.Count(j => j.ColumnId == c.ColumnId), c.Count));
        // The Done column counts the closed jobs; the cancelled ones are left out.
        Assert.Equal(jobs.Count(j => j.StatusKind == JobStatusKind.Done), report.ByColumn[^1].Count);
        Assert.True(report.ByColumn[^1].Count > 40);

        // Everyone in the team, the most open work first: Lerato is the overloaded designer.
        Assert.Equal(people.Select(p => p.Id).Order(), report.ByDesigner.Where(d => d.PersonId != null).Select(d => d.PersonId!.Value).Order());
        Assert.Equal("Lerato Mokoena", report.ByDesigner[0].Name);
        foreach (var designer in report.ByDesigner)
        {
            var theirs = jobs.Where(j => j.DesignerPersonId == designer.PersonId).ToList();
            Assert.Equal(theirs.Count, designer.Counts.Values.Sum());
            Assert.All(designer.Counts, c => Assert.Equal(theirs.Count(j => j.ColumnId == c.Key), c.Value));
        }
    }


    [Fact]
    public async Task Briefs_received_cover_nine_months_ending_this_month()
    {
        var client = await api.SignInAsAsync("Naledi Khumalo");
        var studioId = await GetTeamIdAsync(client, "Design Studio");
        var today = new OrgClock(TimeProvider.System).Today;
        var thisMonth = new DateOnly(today.Year, today.Month, 1);

        var report = await GetReportAsync(client, studioId);

        Assert.Equal(Enumerable.Range(0, 9).Select(i => thisMonth.AddMonths(i - 8)), report.ReceivedByMonth.Select(m => m.Month));
        Assert.All(report.ReceivedByMonth, m => Assert.True(m.Count > 0, $"No briefs in {m.Month}"));
    }

    [Fact]
    public async Task Brand_filter_applies_to_every_widget_and_keeps_the_brand_list()
    {
        var client = await api.SignInAsAsync("Naledi Khumalo");
        var studioId = await GetTeamIdAsync(client, "Design Studio");
        var all = await GetReportAsync(client, studioId);
        var dji = all.Brands.Single(b => b.Name == "DJI");
        var jobs = (await client.GetFromJsonAsync<List<JobDto>>($"/api/teams/{studioId}/jobs", ApiFactory.Json, _ct))!;

        var report = await GetReportAsync(client, studioId, dji.Id);

        Assert.Equal(all.Brands, report.Brands);
        Assert.Equal(jobs.Count(j => j.Department == "DJI" && j.StatusKind != JobStatusKind.Cancelled), report.ByColumn.Sum(c => c.Count));
        Assert.Equal(report.ByColumn.Sum(c => c.Count), report.ByDesigner.Sum(d => d.Counts.Values.Sum()));
        Assert.InRange(report.ReceivedByMonth.Sum(m => m.Count), 1, all.ReceivedByMonth.Sum(m => m.Count) - 1);
    }

    [Fact]
    public async Task Only_users_who_see_all_the_work_see_the_team_report()
    {
        var megan = await api.SignInAsAsync("Megan Botha");
        var studioId = await GetTeamIdAsync(megan, "Design Studio");
        var lerato = await api.SignInAsAsync("Lerato Mokoena");
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        Assert.Equal(HttpStatusCode.OK, (await megan.GetAsync($"/api/teams/{studioId}/reports/briefs", _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await lerato.GetAsync($"/api/teams/{studioId}/reports/briefs", _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await zanele.GetAsync($"/api/teams/{studioId}/reports/briefs", _ct)).StatusCode);
    }

    private async Task<BriefsReportDto> GetReportAsync(HttpClient client, Guid teamId, Guid? departmentId = null) =>
        (await client.GetFromJsonAsync<BriefsReportDto>(
            $"/api/teams/{teamId}/reports/briefs{(departmentId is { } id ? $"?departmentId={id}" : "")}", ApiFactory.Json, _ct))!;

    private async Task<Guid> GetTeamIdAsync(HttpClient client, string name)
    {
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);
        return teams!.Single(t => t.Name == name).Id;
    }
}
