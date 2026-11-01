using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Auth;
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
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        var response = await zanele.PostAsJsonAsync("/api/requests", await NewRequestAsync(zanele, "Roadshow deck"), ApiFactory.Json, _ct);
        var created = await response.Content.ReadFromJsonAsync<RequestDto>(ApiFactory.Json, _ct);
        var fetched = await zanele.GetFromJsonAsync<RequestDto>($"/api/requests/{created!.Id}", ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        // DJI, the first of the brands she manages, is her default brand.
        Assert.Equal((RequestStatus.New, "Studio", "DJI", "Zanele Mthembu"), (fetched!.Status, fetched.TeamName, fetched.Department, fetched.RequesterName));
        Assert.Equal("For the demo.", fetched.MainGoal);
        Assert.Equal(["Key visual", "Social tiles x6"], fetched.Deliverables);
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
        var request = await SubmitAsync("Ayesha Moosa", "Onboarding video storyboard");
        var studioId = await GetTeamIdAsync(naledi, "Studio");
        var project = (await naledi.GetFromJsonAsync<List<ProjectDto>>($"/api/teams/{studioId}/projects", ApiFactory.Json, _ct))!.First();
        var priya = (await naledi.GetFromJsonAsync<List<PersonDto>>($"/api/teams/{studioId}/people", ApiFactory.Json, _ct))!
            .Single(p => p.Name == "Priya Naidoo");

        var accept = new AcceptRequestRequest(project.Id, null, priya.Id, 16, _today.AddDays(10));
        var response = await naledi.PostAsJsonAsync($"/api/requests/{request.Id}/accept", accept, ApiFactory.Json, _ct);
        var accepted = await response.Content.ReadFromJsonAsync<RequestDto>(ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(RequestStatus.Accepted, accepted!.Status);
        var statuses = await naledi.GetFromJsonAsync<List<StatusDto>>($"/api/teams/{studioId}/statuses", ApiFactory.Json, _ct);
        var task = (await naledi.GetFromJsonAsync<List<TaskDto>>($"/api/teams/{studioId}/tasks", ApiFactory.Json, _ct))!
            .Single(t => t.Id == accepted.TaskId);
        Assert.Equal("Briefed in", statuses!.Single(s => s.Id == task.StatusId).Name);
        Assert.Equal(("Onboarding video storyboard", priya.Id, 16m, _today.AddDays(10)), (task.Title, task.AssigneePersonId, task.EstimateHours, task.DueDate));
        Assert.Equal("Main goal\nFor the demo.\n\nDeliverables\n- Key visual\n- Social tiles x6", task.Description);
        Assert.DoesNotContain(await GetInboxAsync(naledi), r => r.Id == request.Id);

        // The requester sees who took it on and the date the team committed to.
        var ayesha = await api.SignInAsAsync("Ayesha Moosa");
        var seen = await ayesha.GetFromJsonAsync<RequestDto>($"/api/requests/{request.Id}", ApiFactory.Json, _ct);
        Assert.Equal(("Priya Naidoo", _today.AddDays(10)), (seen!.AssigneeName, seen.CommittedDueDate));
    }

    [Fact]
    public async Task Accept_as_a_new_brief_creates_the_project_with_a_task_per_deliverable()
    {
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var request = await SubmitAsync("Ayesha Moosa", "Launch kit");
        var studioId = await GetTeamIdAsync(naledi, "Studio");
        var priya = (await naledi.GetFromJsonAsync<List<PersonDto>>($"/api/teams/{studioId}/people", ApiFactory.Json, _ct))!
            .Single(p => p.Name == "Priya Naidoo");
        var brief = await naledi.GetFromJsonAsync<NewBriefDto>($"/api/requests/{request.Id}/new-brief", ApiFactory.Json, _ct);

        // Bambu Lab's last job is BAMBU0057 in sage, so the next is 0058 in the first unused hue; the demo org's
        // financial year starts in October.
        var code = JobCodes.Name("BAMBU", 58, _today.AddDays(14), 10, "Launch kit");
        Assert.Equal((code, "#5b8def"), (brief!.ProjectName, brief.Colour));

        var neither = new AcceptRequestRequest(null, null, priya.Id, 16, _today.AddDays(10));
        Assert.Equal(HttpStatusCode.BadRequest, (await naledi.PostAsJsonAsync($"/api/requests/{request.Id}/accept", neither, ApiFactory.Json, _ct)).StatusCode);
        var accept = neither with { NewProjectName = $" {code} " };
        var response = await naledi.PostAsJsonAsync($"/api/requests/{request.Id}/accept", accept, ApiFactory.Json, _ct);
        var accepted = await response.Content.ReadFromJsonAsync<RequestDto>(ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var project = (await naledi.GetFromJsonAsync<List<ProjectDto>>($"/api/teams/{studioId}/projects", ApiFactory.Json, _ct))!
            .Single(p => p.Name == code);
        Assert.Equal((brief.Colour, "Bambu Lab"), (project.Colour, project.Department));
        var tasks = (await naledi.GetFromJsonAsync<List<TaskDto>>($"/api/teams/{studioId}/tasks", ApiFactory.Json, _ct))!
            .Where(t => t.ProjectId == project.Id)
            .OrderBy(t => t.SortOrder)
            .ToList();
        Assert.Equal(["Key visual", "Social tiles x6"], tasks.Select(t => t.Title));
        Assert.Equal([16m, null], tasks.Select(t => t.EstimateHours));
        Assert.All(tasks, t => Assert.Equal((priya.Id, _today.AddDays(10), "For the demo."), (t.AssigneePersonId, t.DueDate, t.Description)));
        Assert.Equal(tasks[0].Id, accepted!.TaskId);
    }

    [Fact]
    public async Task My_requests_lists_only_the_users_own_requests_newest_first()
    {
        var older = await SubmitAsync("Pieter Smit", "Pieter's first");
        var newer = await SubmitAsync("Pieter Smit", "Pieter's second");
        var someoneElses = await SubmitAsync("Zanele Mthembu", "Zanele's own");
        var pieter = await api.SignInAsAsync("Pieter Smit");

        var mine = await pieter.GetFromJsonAsync<List<RequestDto>>("/api/requests/mine", ApiFactory.Json, _ct);

        Assert.All(mine!, r => Assert.Equal("Pieter Smit", r.RequesterName));
        Assert.DoesNotContain(mine!, r => r.Id == someoneElses.Id);
        Assert.True(mine!.FindIndex(r => r.Id == newer.Id) < mine.FindIndex(r => r.Id == older.Id));
        Assert.Equal(mine.OrderByDescending(r => r.CreatedAt).Select(r => r.Id), mine.Select(r => r.Id));
    }

    [Fact]
    public async Task Reject_keeps_the_reason_and_a_request_is_triaged_only_once()
    {
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var request = await SubmitAsync("Pieter Smit", "Office signage refresh");

        var response = await naledi.PostAsJsonAsync($"/api/requests/{request.Id}/reject", new RejectRequestRequest("  Facilities owns signage.  "), ApiFactory.Json, _ct);
        var rejected = await response.Content.ReadFromJsonAsync<RequestDto>(ApiFactory.Json, _ct);
        var again = await naledi.PostAsJsonAsync($"/api/requests/{request.Id}/reject", new RejectRequestRequest("Twice"), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal((RequestStatus.Rejected, "Facilities owns signage."), (rejected!.Status, rejected.RejectionReason));
        Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode);
    }

    [Fact]
    public async Task Members_and_brand_managers_cannot_triage_or_see_others_requests()
    {
        var request = await SubmitAsync("Zanele Mthembu", "Partner one-pager");
        var jason = await api.SignInAsAsync("Jason van Wyk");
        var ayesha = await api.SignInAsAsync("Ayesha Moosa");
        var studioId = await GetTeamIdAsync(jason, "Studio");

        var memberInbox = await jason.GetAsync($"/api/teams/{studioId}/requests?status=New", _ct);
        var memberReject = await jason.PostAsJsonAsync($"/api/requests/{request.Id}/reject", new RejectRequestRequest("No"), ApiFactory.Json, _ct);
        var otherRequester = await ayesha.GetAsync($"/api/requests/{request.Id}", _ct);

        Assert.Equal(HttpStatusCode.Forbidden, memberInbox.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, memberReject.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, otherRequester.StatusCode);
    }

    [Fact]
    public async Task Everyone_sends_briefs_as_themselves()
    {
        // A member of the team asked has no "Requested by" either: the signed-in user is always the requester (D58).
        var ethan = await api.SignInAsAsync("Ethan Pillay");
        var options = await ethan.GetFromJsonAsync<RequestOptionsDto>("/api/requests/options", ApiFactory.Json, _ct);

        var response = await ethan.PostAsJsonAsync("/api/requests", await NewRequestAsync(ethan, "Studio's own brief"), ApiFactory.Json, _ct);
        var created = await response.Content.ReadFromJsonAsync<RequestDto>(ApiFactory.Json, _ct);

        Assert.Null(options!.MyDepartmentId);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("Ethan Pillay", created!.RequesterName);
        Assert.Contains((await ethan.GetFromJsonAsync<List<RequestDto>>("/api/requests/mine", ApiFactory.Json, _ct))!, r => r.Id == created.Id);
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        Assert.DoesNotContain((await zanele.GetFromJsonAsync<List<RequestDto>>("/api/requests/mine", ApiFactory.Json, _ct))!, r => r.Id == created.Id);
    }

    [Fact]
    public async Task Invalid_requests_return_400()
    {
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var valid = await NewRequestAsync(zanele, "Valid");

        CreateRequestRequest[] invalids =
        [
            valid with { Title = "" },
            valid with { RequestedDueDate = _today.AddDays(-1) },
            valid with { TeamId = Guid.Empty },
            valid with { Deliverables = "Banner\n" + new string('x', 201) },
        ];
        foreach (var invalid in invalids)
        {
            var response = await zanele.PostAsJsonAsync("/api/requests", invalid, ApiFactory.Json, _ct);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }

    [Fact]
    public async Task Options_give_each_team_its_colour()
    {
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        var options = await zanele.GetFromJsonAsync<RequestOptionsDto>("/api/requests/options", ApiFactory.Json, _ct);

        Assert.All(options!.Teams, team => Assert.Matches("^#[0-9a-f]{6}$", team.Colour));
    }

    private async Task<CreateRequestRequest> NewRequestAsync(HttpClient client, string title)
    {
        var options = await client.GetFromJsonAsync<RequestOptionsDto>("/api/requests/options", ApiFactory.Json, _ct);
        var studio = options!.Teams.Single(t => t.Name == "Studio").Id;
        // The first brand the user manages; DJI for everyone else.
        var brand = options.MyDepartmentId ?? options.Departments.Single(d => d.Name == "DJI").Id;
        return new CreateRequestRequest(
            studio, title, "For the demo.", "Key visual\n- Social tiles x6\n\n", brand, _today.AddDays(14), Priority.High);
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
            $"/api/teams/{await GetTeamIdAsync(client, "Studio")}/requests?status=New", ApiFactory.Json, _ct))!;

    private async Task<Guid> GetTeamIdAsync(HttpClient client, string name)
    {
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);
        return teams!.Single(t => t.Name == name).Id;
    }
}
