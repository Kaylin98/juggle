using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Requests;
using Juggle.Api.Features.Tasks;
using Juggle.Api.Features.Teams;

namespace Juggle.Api.Tests;

// Tests share one seeded database, so each test submits and triages its own request.
public sealed class RequestsTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;
    private readonly DateOnly _today = new OrgClock(TimeProvider.System).Today;

    [Fact]
    public async Task Requester_submits_a_request_and_sees_its_status()
    {
        var david = await api.SignInAsAsync("David Cohen");

        var response = await david.PostAsJsonAsync("/api/requests", await NewRequestAsync(david, "Roadshow deck"), ApiFactory.Json, _ct);
        var created = await response.Content.ReadFromJsonAsync<RequestDto>(ApiFactory.Json, _ct);
        var fetched = await david.GetFromJsonAsync<RequestDto>($"/api/requests/{created!.Id}", ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal((RequestStatus.New, "Design", "Sales", "David Cohen"), (fetched!.Status, fetched.TeamName, fetched.Department, fetched.RequesterName));
    }

    [Fact]
    public async Task Team_admin_sees_new_requests_newest_first()
    {
        var naledi = await api.SignInAsAsync("Naledi Khumalo");

        var inbox = await GetInboxAsync(naledi);

        Assert.True(inbox.Count >= 5);
        Assert.All(inbox, r => Assert.Equal(RequestStatus.New, r.Status));
        Assert.Equal(inbox.OrderByDescending(r => r.CreatedAt).Select(r => r.Id), inbox.Select(r => r.Id));
    }

    [Fact]
    public async Task Accept_creates_a_task_in_the_first_column_after_triage()
    {
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var request = await SubmitAsync("Kyle Govender", "Onboarding video storyboard");
        var designId = await GetTeamIdAsync(naledi, "Design");
        var project = (await naledi.GetFromJsonAsync<List<ProjectDto>>($"/api/teams/{designId}/projects", ApiFactory.Json, _ct))!.First();
        var priya = (await naledi.GetFromJsonAsync<List<PersonDto>>($"/api/teams/{designId}/people", ApiFactory.Json, _ct))!
            .Single(p => p.Name == "Priya Naidoo");

        var accept = new AcceptRequestRequest(project.Id, priya.Id, 16, _today.AddDays(10));
        var response = await naledi.PostAsJsonAsync($"/api/requests/{request.Id}/accept", accept, ApiFactory.Json, _ct);
        var accepted = await response.Content.ReadFromJsonAsync<RequestDto>(ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(RequestStatus.Accepted, accepted!.Status);
        var statuses = await naledi.GetFromJsonAsync<List<StatusDto>>($"/api/teams/{designId}/statuses", ApiFactory.Json, _ct);
        var task = (await naledi.GetFromJsonAsync<List<TaskDto>>($"/api/teams/{designId}/tasks", ApiFactory.Json, _ct))!
            .Single(t => t.Id == accepted.TaskId);
        Assert.Equal("To Do", statuses!.Single(s => s.Id == task.StatusId).Name);
        Assert.Equal(("Onboarding video storyboard", priya.Id, 16m, _today.AddDays(10)), (task.Title, task.AssigneePersonId, task.EstimateHours, task.DueDate));
        Assert.DoesNotContain(await GetInboxAsync(naledi), r => r.Id == request.Id);

        // The requester sees who took it on and the date the team committed to.
        var kyle = await api.SignInAsAsync("Kyle Govender");
        var seen = await kyle.GetFromJsonAsync<RequestDto>($"/api/requests/{request.Id}", ApiFactory.Json, _ct);
        Assert.Equal(("Priya Naidoo", _today.AddDays(10)), (seen!.AssigneeName, seen.CommittedDueDate));
    }

    [Fact]
    public async Task My_requests_lists_only_the_users_own_requests_newest_first()
    {
        var older = await SubmitAsync("Fatima Patel", "Fatima's first");
        var newer = await SubmitAsync("Fatima Patel", "Fatima's second");
        var someoneElses = await SubmitAsync("David Cohen", "David's own");
        var fatima = await api.SignInAsAsync("Fatima Patel");

        var mine = await fatima.GetFromJsonAsync<List<RequestDto>>("/api/requests/mine", ApiFactory.Json, _ct);

        Assert.All(mine!, r => Assert.Equal("Fatima Patel", r.RequesterName));
        Assert.DoesNotContain(mine!, r => r.Id == someoneElses.Id);
        Assert.True(mine!.FindIndex(r => r.Id == newer.Id) < mine.FindIndex(r => r.Id == older.Id));
        Assert.Equal(mine.OrderByDescending(r => r.CreatedAt).Select(r => r.Id), mine.Select(r => r.Id));
    }

    [Fact]
    public async Task Reject_keeps_the_reason_and_a_request_is_triaged_only_once()
    {
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var request = await SubmitAsync("Fatima Patel", "Office signage refresh");

        var response = await naledi.PostAsJsonAsync($"/api/requests/{request.Id}/reject", new RejectRequestRequest("  Facilities owns signage.  "), ApiFactory.Json, _ct);
        var rejected = await response.Content.ReadFromJsonAsync<RequestDto>(ApiFactory.Json, _ct);
        var again = await naledi.PostAsJsonAsync($"/api/requests/{request.Id}/reject", new RejectRequestRequest("Twice"), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal((RequestStatus.Rejected, "Facilities owns signage."), (rejected!.Status, rejected.RejectionReason));
        Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode);
    }

    [Fact]
    public async Task Members_and_requesters_cannot_triage()
    {
        var request = await SubmitAsync("David Cohen", "Partner one-pager");
        var jason = await api.SignInAsAsync("Jason van Wyk");
        var kyle = await api.SignInAsAsync("Kyle Govender");
        var designId = await GetTeamIdAsync(jason, "Design");

        var memberInbox = await jason.GetAsync($"/api/teams/{designId}/requests?status=New", _ct);
        var memberReject = await jason.PostAsJsonAsync($"/api/requests/{request.Id}/reject", new RejectRequestRequest("No"), ApiFactory.Json, _ct);
        var otherRequester = await kyle.GetAsync($"/api/requests/{request.Id}", _ct);

        Assert.Equal(HttpStatusCode.Forbidden, memberInbox.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, memberReject.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, otherRequester.StatusCode);
    }

    [Fact]
    public async Task Invalid_requests_return_400()
    {
        var david = await api.SignInAsAsync("David Cohen");
        var valid = await NewRequestAsync(david, "Valid");

        foreach (var invalid in new[] { valid with { Title = "" }, valid with { RequestedDueDate = _today.AddDays(-1) }, valid with { TeamId = Guid.Empty } })
        {
            var response = await david.PostAsJsonAsync("/api/requests", invalid, ApiFactory.Json, _ct);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }

    private async Task<CreateRequestRequest> NewRequestAsync(HttpClient client, string title)
    {
        var options = await client.GetFromJsonAsync<RequestOptionsDto>("/api/requests/options", ApiFactory.Json, _ct);
        var design = options!.Teams.Single(t => t.Name == "Design").Id;
        return new CreateRequestRequest(design, RequestType.Presentation, title, "For the demo.", options.MyDepartmentId!.Value, _today.AddDays(14), Priority.High);
    }

    private async Task<RequestDto> SubmitAsync(string requester, string title)
    {
        var client = await api.SignInAsAsync(requester);
        var response = await client.PostAsJsonAsync("/api/requests", await NewRequestAsync(client, title), ApiFactory.Json, _ct);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<RequestDto>(ApiFactory.Json, _ct))!;
    }

    private async Task<List<RequestDto>> GetInboxAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<RequestDto>>(
            $"/api/teams/{await GetTeamIdAsync(client, "Design")}/requests?status=New", ApiFactory.Json, _ct))!;

    private async Task<Guid> GetTeamIdAsync(HttpClient client, string name)
    {
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);
        return teams!.Single(t => t.Name == name).Id;
    }
}
