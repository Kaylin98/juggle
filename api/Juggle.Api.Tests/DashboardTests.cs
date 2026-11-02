using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Capacity;
using Juggle.Api.Features.Dashboard;
using Juggle.Api.Features.Jobs;
using Juggle.Api.Features.Teams;

namespace Juggle.Api.Tests;

// Other test classes add jobs and bookings in parallel, so these run on their own and compare against the live data.
[CollectionDefinition(DisableParallelization = true)]
public sealed class RunsAlone;

[Collection(typeof(RunsAlone))]
public sealed class DashboardTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;
    private readonly DateOnly _monday = new OrgClock(TimeProvider.System).Today.StartOfWeek();

    [Fact]
    public async Task Utilisation_matches_the_schedule_for_this_week_and_the_next_four()
    {
        var client = await api.SignInAsAsync("Naledi Khumalo");
        var studioId = await GetTeamIdAsync(client, "Design Studio");

        var dashboard = await GetDashboardAsync(client, studioId.ToString());
        var schedule = await client.GetFromJsonAsync<CapacityDto>(
            $"/api/capacity?teamId={studioId}&start={_monday:yyyy-MM-dd}&weeks=8", ApiFactory.Json, _ct);

        Assert.Equal(schedule!.People.Select(p => p.Id), dashboard.People.Select(p => p.Id));
        foreach (var person in schedule.People)
        {
            var thisWeek = person.Days.Where(d => d.Date < _monday.AddDays(7)).ToList();
            var nextFour = person.Days.Where(d => d.Date >= _monday.AddDays(7) && d.Date < _monday.AddDays(35));
            var expected = (Total(thisWeek), Total(nextFour), thisWeek.Any(d => d.Allocated > d.Capacity));

            var shown = dashboard.People.Single(p => p.Id == person.Id);
            Assert.Equal(expected, (shown.ThisWeek, shown.NextFourWeeks, shown.OverThisWeek));
        }
        Assert.Contains(dashboard.People, p => p.NextFourWeeks.Allocated > 0);
    }

    [Fact]
    public async Task Seeded_story_has_the_demo_loads()
    {
        var client = await api.SignInAsAsync("Naledi Khumalo");
        var studioId = await GetTeamIdAsync(client, "Design Studio");

        var dashboard = await GetDashboardAsync(client, studioId.ToString());
        var nextWeek = await client.GetFromJsonAsync<CapacityDto>(
            $"/api/capacity?teamId={studioId}&start={_monday.AddDays(7):yyyy-MM-dd}&weeks=1", ApiFactory.Json, _ct);
        var fourWeeks = await client.GetFromJsonAsync<CapacityDto>(
            $"/api/capacity?teamId={studioId}&start={_monday:yyyy-MM-dd}&weeks=4", ApiFactory.Json, _ct);

        // Lerato is the overloaded designer: the only one over this week, and over next week too.
        Assert.Equal(["Lerato Mokoena"], dashboard.People.Where(p => p.OverThisWeek).Select(p => p.Name));
        Assert.Contains(nextWeek!.People.Single(p => p.Name == "Lerato Mokoena").Days, d => d.Allocated > d.Capacity);
        var lerato = fourWeeks!.People.Single(p => p.Name == "Lerato Mokoena").Days;
        Assert.True(lerato.Count(d => d.Date < _monday.AddDays(14) && d.Allocated > d.Capacity) >= 6);

        // Priya shows as available over 4 weeks; next week she is at 50%, so the demo's 16h booking turns her amber.
        var priya = Total(fourWeeks!.People.Single(p => p.Name == "Priya Naidoo").Days);
        Assert.True(priya.Allocated / priya.Capacity < 0.5m);
        Assert.Equal(new LoadDto(20, 40), Total(nextWeek.People.Single(p => p.Name == "Priya Naidoo").Days));
    }

    [Fact]
    public async Task Counts_match_the_board_and_the_incoming_queue()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var studioId = await GetTeamIdAsync(client, "Design Studio");
        var jobs = (await client.GetFromJsonAsync<List<JobDto>>($"/api/teams/{studioId}/jobs", ApiFactory.Json, _ct))!;
        var incoming = await client.GetFromJsonAsync<List<JobDto>>($"/api/teams/{studioId}/incoming", ApiFactory.Json, _ct);
        string[] approvals = ["Awaiting Design Approval", "Awaiting Marketing Approval", "Awaiting Business Approval"];

        var dashboard = await GetDashboardAsync(client, studioId.ToString());

        Assert.Equal([new TeamCountDto(studioId, "Design Studio", jobs.Count(j => j.IsOverdue))], dashboard.OverdueJobs);
        Assert.Equal([new TeamCountDto(studioId, "Design Studio", incoming!.Count)], dashboard.Incoming);
        Assert.Equal([new TeamCountDto(studioId, "Design Studio", jobs.Count(j => approvals.Contains(j.StatusName)))], dashboard.AwaitingApproval);
        // Other tests send jobs on to approval, so only the seeded four are certain.
        Assert.Equal(4, dashboard.OverdueJobs[0].Count);
        Assert.True(dashboard.AwaitingApproval[0].Count >= 4);
        Assert.Equal(jobs.Count(j => j.StatusKind == JobStatusKind.Open), dashboard.WorkByDepartment.Sum(d => d.Count));
        Assert.Equal(dashboard.WorkByDepartment.OrderByDescending(d => d.Count), dashboard.WorkByDepartment);
    }

    [Fact]
    public async Task Users_who_see_all_work_see_every_team_and_everyone()
    {
        var client = await api.SignInAsAsync("Megan Botha");
        var schedule = await client.GetFromJsonAsync<CapacityDto>(
            $"/api/capacity?teamId=all&start={_monday:yyyy-MM-dd}&weeks=1", ApiFactory.Json, _ct);

        var dashboard = await GetDashboardAsync(client, "all");

        Assert.Equal(["Design Studio"], dashboard.OverdueJobs.Select(t => t.TeamName));
        Assert.Equal(["Design Studio"], dashboard.Incoming.Select(t => t.TeamName));
        Assert.Equal(["Design Studio"], dashboard.AwaitingApproval.Select(t => t.TeamName));
        Assert.Equal(schedule!.People.Count, dashboard.People.Count);
    }

    [Fact]
    public async Task Designers_and_marketing_managers_get_403()
    {
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var studioId = await GetTeamIdAsync(naledi, "Design Studio");
        var ethan = await api.SignInAsAsync("Ethan Pillay");
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        Assert.Equal(HttpStatusCode.Forbidden, (await ethan.GetAsync($"/api/dashboard?teamId={studioId}", _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await ethan.GetAsync("/api/dashboard?teamId=all", _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await zanele.GetAsync($"/api/dashboard?teamId={studioId}", _ct)).StatusCode);
    }

    private static LoadDto Total(IEnumerable<DayLoad> days) => new(days.Sum(d => d.Allocated), days.Sum(d => d.Capacity));

    private async Task<DashboardDto> GetDashboardAsync(HttpClient client, string teamId) =>
        (await client.GetFromJsonAsync<DashboardDto>($"/api/dashboard?teamId={teamId}", ApiFactory.Json, _ct))!;

    private async Task<Guid> GetTeamIdAsync(HttpClient client, string name)
    {
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);
        return teams!.Single(t => t.Name == name).Id;
    }
}
