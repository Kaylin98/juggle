using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Auth;
using Juggle.Api.Features.Capacity;
using Juggle.Api.Features.MyWork;
using Juggle.Api.Features.Tasks;
using Juggle.Api.Features.Teams;

namespace Juggle.Api.Tests;

// Compares against the live boards, which other test classes change in parallel.
[Collection(typeof(RunsAlone))]
public sealed class MyWorkTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;
    private readonly DateOnly _monday = new OrgClock(TimeProvider.System).Today.StartOfWeek();

    [Fact]
    public async Task Lists_my_open_tasks_from_every_team_overdue_first()
    {
        var jason = await api.SignInAsAsync("Jason van Wyk");
        var me = await jason.GetFromJsonAsync<MeDto>("/api/auth/me", ApiFactory.Json, _ct);
        var teams = await jason.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);

        var expected = new List<Guid>();
        foreach (var team in teams!)
        {
            var statuses = await jason.GetFromJsonAsync<List<StatusDto>>($"/api/teams/{team.Id}/statuses", ApiFactory.Json, _ct);
            var board = statuses!.Where(s => s.Order > statuses!.Min(x => x.Order) && s.Category != StatusCategory.Done).Select(s => s.Id).ToHashSet();
            var tasks = await jason.GetFromJsonAsync<List<TaskDto>>($"/api/teams/{team.Id}/tasks", ApiFactory.Json, _ct);
            expected.AddRange(tasks!.Where(t => t.AssigneePersonId == me!.PersonId && board.Contains(t.StatusId)).Select(t => t.Id));
        }

        var myWork = await GetMyWorkAsync(jason);

        Assert.Equal(expected.Order(), myWork.Tasks.Select(t => t.Task.Id).Order());
        Assert.Equal(["Marketing", "Studio"], myWork.Tasks.Select(t => t.TeamName).Distinct().Order());
        Assert.DoesNotContain(myWork.Tasks, t => t.Category == StatusCategory.Done);
        Assert.True(myWork.Tasks[0].Task.IsOverdue);
        Assert.Equal(myWork.Tasks.OrderByDescending(t => t.Task.IsOverdue).ThenBy(t => t.Task.DueDate ?? DateOnly.MaxValue), myWork.Tasks);
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
    public async Task Brand_managers_without_a_person_get_403()
    {
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        Assert.Equal(HttpStatusCode.Forbidden, (await zanele.GetAsync("/api/my-work", _ct)).StatusCode);
    }

    private async Task<MyWorkDto> GetMyWorkAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<MyWorkDto>("/api/my-work", ApiFactory.Json, _ct))!;
}
