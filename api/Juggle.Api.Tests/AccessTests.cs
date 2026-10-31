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
    public async Task Requester_only_uses_requests()
    {
        var data = await DesignDataAsync();
        var david = await api.SignInAsAsync("David Cohen");
        var team = $"/api/teams/{data.TeamId}";

        await AssertGetStatusAsync(david, HttpStatusCode.Forbidden,
            $"{team}/tasks", $"{team}/statuses", $"{team}/projects", $"{team}/people",
            $"{team}/requests", $"/api/capacity?teamId={data.TeamId}&start={_monday:yyyy-MM-dd}",
            $"/api/dashboard?teamId={data.TeamId}", $"/api/requests/{data.SomeoneElsesRequest}");
        await AssertGetStatusAsync(david, HttpStatusCode.OK, "/api/requests/mine", "/api/requests/options");
        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(david, $"{team}/tasks", new CreateTaskRequest("Mine", data.ProjectId, null, null, null, null, null)));
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

    /// <summary>Ids from the Design team, read as its admin. The task and request are not Ethan's or David's.</summary>
    private async Task<DesignData> DesignDataAsync()
    {
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var teams = await naledi.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);
        var teamId = teams!.Single(t => t.Name == "Design").Id;
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
            inbox.First(r => r.RequesterName != "David Cohen").Id);
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
