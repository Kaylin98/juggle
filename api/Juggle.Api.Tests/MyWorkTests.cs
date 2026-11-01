using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Auth;
using Juggle.Api.Features.Capacity;
using Juggle.Api.Features.Jobs;
using Juggle.Api.Features.MyWork;
using Juggle.Api.Features.Teams;

namespace Juggle.Api.Tests;

// Compares against the live boards, which other test classes change in parallel.
[Collection(typeof(RunsAlone))]
public sealed class MyWorkTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;
    private readonly DateOnly _monday = new OrgClock(TimeProvider.System).Today.StartOfWeek();

    [Fact]
    public async Task Lists_my_open_jobs_from_every_team_overdue_first()
    {
        var priya = await api.SignInAsAsync("Priya Naidoo");
        var me = await priya.GetFromJsonAsync<MeDto>("/api/auth/me", ApiFactory.Json, _ct);
        var teams = await priya.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);

        var expected = new List<Guid>();
        foreach (var team in teams!)
        {
            var jobs = await priya.GetFromJsonAsync<List<JobDto>>($"/api/teams/{team.Id}/jobs", ApiFactory.Json, _ct);
            expected.AddRange(jobs!.Where(j => j.DesignerPersonId == me!.PersonId && j.StatusKind == JobStatusKind.Open).Select(j => j.Id));
        }

        var myWork = await GetMyWorkAsync(priya);

        Assert.Equal(expected.Order(), myWork.Jobs.Select(j => j.Id).Order());
        Assert.Equal(["Design Studio"], myWork.Jobs.Select(j => j.TeamName).Distinct());
        Assert.True(myWork.Jobs[0].IsOverdue);
        Assert.Equal(myWork.Jobs.OrderByDescending(j => j.IsOverdue).ThenBy(j => j.RequiredDate ?? DateOnly.MaxValue), myWork.Jobs);
    }

    [Fact]
    public async Task Schedule_matches_the_schedule_page_for_this_week_and_next()
    {
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var schedule = await naledi.GetFromJsonAsync<CapacityDto>(
            $"/api/capacity?teamId=all&start={_monday:yyyy-MM-dd}&weeks=2", ApiFactory.Json, _ct);
        var amahle = schedule!.People.Single(p => p.Name == "Amahle Dlamini");

        var myWork = await GetMyWorkAsync(await api.SignInAsAsync("Amahle Dlamini"));

        Assert.Equal(amahle.Days, myWork.Days);
        Assert.Equal(
            schedule.Allocations.Where(a => a.PersonId == amahle.Id).Select(a => a.Id).Order(),
            myWork.Bookings.Select(b => b.Id).Order());

        // The seed puts Amahle on three days of annual leave next week.
        var leave = Assert.Single(myWork.TimeOff);
        Assert.Equal(("Annual leave", _monday.AddDays(7), 3), (leave.Label, leave.StartDate, leave.WorkingDays));
    }

    [Fact]
    public async Task Marketing_managers_without_a_person_get_403()
    {
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        Assert.Equal(HttpStatusCode.Forbidden, (await zanele.GetAsync("/api/my-work", _ct)).StatusCode);
    }

    private async Task<MyWorkDto> GetMyWorkAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<MyWorkDto>("/api/my-work", ApiFactory.Json, _ct))!;
}
