using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Capacity;
using Juggle.Api.Features.Teams;

namespace Juggle.Api.Tests;

public sealed class CapacityCalculatorTests
{
    private static readonly Person Person = new() { JobTitle = "Designer", HoursPerDay = 8 };
    private static readonly DateOnly Monday = new(2026, 11, 2);

    private static readonly Allocation[] Allocations =
    [
        new() { StartDate = Monday, EndDate = Monday.AddDays(4), HoursPerDay = 5 },
        new() { StartDate = Monday.AddDays(1), EndDate = Monday.AddDays(1), HoursPerDay = 4 },
    ];

    private static readonly TimeOff[] Leave =
    [
        new() { StartDate = Monday.AddDays(2), EndDate = Monday.AddDays(2), Description = "Annual leave" },
    ];

    [Fact]
    public void Working_day_adds_up_every_allocation_on_that_day()
    {
        var day = CapacityCalculator.ForDay(Person, Monday.AddDays(1), Allocations, Leave);

        Assert.Equal(new DayLoad(Monday.AddDays(1), 8, 9, null), day);
    }

    [Fact]
    public void Leave_day_has_no_capacity_and_no_allocated_hours()
    {
        var day = CapacityCalculator.ForDay(Person, Monday.AddDays(2), Allocations, Leave);

        Assert.Equal(new DayLoad(Monday.AddDays(2), 0, 0, "Annual leave"), day);
    }

    [Fact]
    public void Weekend_is_not_a_working_day()
    {
        var day = CapacityCalculator.ForDay(Person, Monday.AddDays(5), Allocations, Leave);

        Assert.Equal(0, day.Capacity);
        Assert.Equal("Weekend", day.TimeOff);
    }
}

public sealed class CapacityTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;
    private readonly DateOnly _nextWeek = new OrgClock(TimeProvider.System).Today.StartOfWeek().AddDays(7);

    [Fact]
    public async Task Design_schedule_shows_the_seeded_story_for_next_week()
    {
        var client = await api.SignInAsAsync("Naledi Khumalo");

        var schedule = await GetAsync(client, await GetTeamIdAsync(client, "Design"), _nextWeek, 1);

        Assert.Equal(5, schedule.Days.Count);
        Assert.Equal(8, schedule.People.Count);
        var lerato = schedule.People.Single(p => p.Name == "Lerato Mokoena");
        Assert.Contains(lerato.Days, d => d.Allocated > d.Capacity);
        var amahle = schedule.People.Single(p => p.Name == "Amahle Dlamini");
        Assert.Equal(0, amahle.Days[0].Capacity);
        Assert.NotNull(amahle.Days[0].TimeOff);
    }

    [Fact]
    public async Task Other_teams_work_is_flagged_and_counts_towards_load()
    {
        var client = await api.SignInAsAsync("Naledi Khumalo");

        var schedule = await GetAsync(client, await GetTeamIdAsync(client, "Design"), _nextWeek, 2);

        var jason = schedule.People.Single(p => p.Name == "Jason van Wyk");
        var jasonBars = schedule.Allocations.Where(a => a.PersonId == jason.Id).ToList();
        Assert.Contains(jasonBars, a => a.OtherTeam && a.ProjectName == "Social Calendar");
        Assert.Contains(jasonBars, a => !a.OtherTeam && a.ProjectName == "Q1 Campaign");
        Assert.Contains(jason.Days, d => d.TimeOff is null && d.Allocated == 6.5m);
    }

    [Fact]
    public async Task Org_admin_can_see_all_teams_but_a_member_cannot()
    {
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var jason = await api.SignInAsAsync("Jason van Wyk");

        var all = await GetAsync(naledi, "all", _nextWeek, 1);
        var response = await jason.GetAsync($"/api/capacity?teamId=all&start={_nextWeek:yyyy-MM-dd}&weeks=1", _ct);

        Assert.Equal(11, all.People.Count);
        Assert.All(all.Allocations, a => Assert.False(a.OtherTeam));
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Weeks_other_than_1_2_or_4_return_400()
    {
        var client = await api.SignInAsAsync("Naledi Khumalo");

        var response = await client.GetAsync($"/api/capacity?teamId=all&start={_nextWeek:yyyy-MM-dd}&weeks=3", _ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<string> GetTeamIdAsync(HttpClient client, string name)
    {
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);
        return teams!.Single(t => t.Name == name).Id.ToString();
    }

    private async Task<CapacityDto> GetAsync(HttpClient client, string teamId, DateOnly start, int weeks) =>
        (await client.GetFromJsonAsync<CapacityDto>($"/api/capacity?teamId={teamId}&start={start:yyyy-MM-dd}&weeks={weeks}", ApiFactory.Json, _ct))!;
}
