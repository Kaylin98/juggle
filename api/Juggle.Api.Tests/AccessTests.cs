using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Features.Allocations;
using Juggle.Api.Features.Requests;
using Juggle.Api.Features.Tasks;
using Juggle.Api.Features.Teams;

namespace Juggle.Api.Tests;

/// <summary>
/// The role audit (D24): every endpoint a role must not use is refused by the server, whatever the UI shows.
/// Nothing here is allowed to succeed, so these tests change no data.
/// </summary>
public sealed class AccessTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;
    private readonly DateOnly _monday = new OrgClock(TimeProvider.System).Today.StartOfWeek().AddDays(7 * 20);

    [Fact]
    public async Task Signed_out_users_get_401()
    {
        var client = api.CreateClient();

        await AssertGetStatusAsync(client, HttpStatusCode.Unauthorized,
            "/api/auth/me", "/api/teams", "/api/requests/mine", "/api/dashboard?teamId=all");
    }

    [Fact]
    public async Task Brand_manager_sees_only_their_brands_cards_and_cannot_triage_or_change_work()
    {
        var data = await DesignDataAsync();
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var team = $"/api/teams/{data.TeamId}";

        await AssertGetStatusAsync(zanele, HttpStatusCode.Forbidden,
            $"{team}/requests", $"/api/dashboard?teamId={data.TeamId}", $"/api/requests/{data.SomeoneElsesRequest}",
            $"/api/teams/{data.TeamId}/reports/briefs", "/api/my-work");
        await AssertGetStatusAsync(zanele, HttpStatusCode.OK,
            "/api/requests/mine", "/api/requests/options", $"{team}/statuses", $"{team}/people");

        // The board shows only the brands she manages (D58).
        var projects = (await zanele.GetFromJsonAsync<List<ProjectDto>>($"{team}/projects", ApiFactory.Json, _ct))!;
        var tasks = (await zanele.GetFromJsonAsync<List<TaskDto>>($"{team}/tasks", ApiFactory.Json, _ct))!;
        Assert.Equal(["DJI", "Pure Electric"], projects.Select(p => p.Department).Distinct().Order());
        Assert.NotEmpty(tasks);
        Assert.All(tasks, t => Assert.Contains(projects, p => p.Id == t.ProjectId));

        // Her cards are read-only, and she approves only her own brands' work.
        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(zanele, $"{team}/tasks", new CreateTaskRequest("Mine", projects[0].Id, null, null, null, null, null)));
        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(zanele, $"/api/tasks/{tasks[0].Id}/move", new MoveTaskRequest(tasks[0].StatusId, 0)));
        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(zanele, $"/api/tasks/{data.OthersTask.Id}/approve", new { }));
    }

    [Fact]
    public async Task Member_cannot_triage_see_the_dashboard_book_or_change_others_tasks()
    {
        var data = await DesignDataAsync();
        var ethan = await api.SignInAsAsync("Ethan Pillay");
        var team = $"/api/teams/{data.TeamId}";

        await AssertGetStatusAsync(ethan, HttpStatusCode.OK,
            $"{team}/tasks", $"/api/capacity?teamId={data.TeamId}&start={_monday:yyyy-MM-dd}");
        await AssertGetStatusAsync(ethan, HttpStatusCode.Forbidden,
            $"{team}/requests", $"/api/requests/{data.NewRequest}/new-brief", $"/api/dashboard?teamId={data.TeamId}", "/api/dashboard?teamId=all",
            $"/api/capacity?teamId=all&start={_monday:yyyy-MM-dd}");

        var others = data.OthersTask;
        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(ethan, $"/api/requests/{data.NewRequest}/accept", new AcceptRequestRequest(data.ProjectId, null, null, null, null)));
        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(ethan, $"/api/requests/{data.NewRequest}/reject", new RejectRequestRequest("No")));
        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(ethan, "/api/allocations", Booking(data)));
        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(ethan, $"/api/tasks/{others.Id}/move", new MoveTaskRequest(others.StatusId, 0)));
        var update = new UpdateTaskRequest("Renamed", null, others.AssigneePersonId, null, null, null);
        Assert.Equal(HttpStatusCode.Forbidden, (await ethan.PutAsJsonAsync($"/api/tasks/{others.Id}", update, ApiFactory.Json, _ct)).StatusCode);
    }

    [Fact]
    public async Task Team_admin_cannot_use_another_team()
    {
        var data = await DesignDataAsync();
        var megan = await api.SignInAsAsync("Megan Botha");
        var team = $"/api/teams/{data.TeamId}";

        await AssertGetStatusAsync(megan, HttpStatusCode.Forbidden,
            $"{team}/tasks", $"{team}/requests", $"/api/dashboard?teamId={data.TeamId}",
            $"/api/capacity?teamId={data.TeamId}&start={_monday:yyyy-MM-dd}");
        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(megan, $"/api/requests/{data.NewRequest}/reject", new RejectRequestRequest("No")));
        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(megan, "/api/allocations", Booking(data)));
    }

    private sealed record DesignData(Guid TeamId, Guid ProjectId, Guid PersonId, TaskDto OthersTask, Guid NewRequest, Guid SomeoneElsesRequest);

    /// <summary>
    /// Ids from the Studio, read as its admin. The task is Naledi's (not Ethan's, and not a brand Zanele manages); the
    /// request is not Zanele's.
    /// </summary>
    private async Task<DesignData> DesignDataAsync()
    {
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var teams = await naledi.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);
        var teamId = teams!.Single(t => t.Name == "Studio").Id;
        var people = await naledi.GetFromJsonAsync<List<PersonDto>>($"/api/teams/{teamId}/people", ApiFactory.Json, _ct);
        var projects = await naledi.GetFromJsonAsync<List<ProjectDto>>($"/api/teams/{teamId}/projects", ApiFactory.Json, _ct);
        var tasks = await naledi.GetFromJsonAsync<List<TaskDto>>($"/api/teams/{teamId}/tasks", ApiFactory.Json, _ct);
        var inbox = (await naledi.GetFromJsonAsync<List<RequestDto>>($"/api/teams/{teamId}/requests?status=New", ApiFactory.Json, _ct))!;

        var naledisPerson = people!.Single(p => p.Name == "Naledi Khumalo").Id;
        return new DesignData(
            teamId,
            projects!.First().Id,
            naledisPerson,
            tasks!.First(t => t.AssigneePersonId == naledisPerson),
            inbox.First().Id,
            inbox.First(r => r.RequesterName != "Zanele Mthembu").Id);
    }

    private SaveAllocationRequest Booking(DesignData data) =>
        new(data.PersonId, data.ProjectId, null, _monday, _monday.AddDays(1), 2, null);

    /// <summary>GETs each url and checks the status.</summary>
    private async Task AssertGetStatusAsync(HttpClient client, HttpStatusCode expected, params string[] urls)
    {
        foreach (var url in urls)
        {
            var response = await client.GetAsync(url, _ct);
            Assert.True(response.StatusCode == expected, $"{url}: expected {(int)expected}, got {(int)response.StatusCode}");
        }
    }

    private async Task<HttpStatusCode> PostAsync<T>(HttpClient client, string url, T body) =>
        (await client.PostAsJsonAsync(url, body, ApiFactory.Json, _ct)).StatusCode;
}
