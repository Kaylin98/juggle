using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Features.Tasks;
using Juggle.Api.Features.Teams;

namespace Juggle.Api.Tests;

// Tests share one seeded database, so each test moves or edits a different task.
public sealed class TasksTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;

    [Fact]
    public async Task Design_and_Marketing_have_different_columns()
    {
        var client = await api.SignInAsAsync("Naledi Khumalo");

        var design = await GetStatusesAsync(client, "Design");
        var marketing = await GetStatusesAsync(client, "Marketing");

        Assert.Equal(["Triage", "To Do", "In Design", "Internal Review", "With Requester", "Changes Requested", "Done"], design.Select(s => s.Name));
        Assert.Equal(["Triage", "Planned", "Writing", "Review", "Scheduled", "Published"], marketing.Select(s => s.Name));
    }

    [Fact]
    public async Task Move_puts_the_task_at_the_index_and_persists()
    {
        var client = await api.SignInAsAsync("Naledi Khumalo");
        var inDesign = (await GetStatusesAsync(client, "Design")).Single(s => s.Name == "In Design");
        var task = (await GetTasksAsync(client, "Design")).Single(t => t.Title == "Customer logo wall");

        var response = await client.PostAsJsonAsync($"/api/tasks/{task.Id}/move", new MoveTaskRequest(inDesign.Id, 1), ApiFactory.Json, _ct);
        response.EnsureSuccessStatusCode();

        var column = (await GetTasksAsync(client, "Design")).Where(t => t.StatusId == inDesign.Id).OrderBy(t => t.SortOrder).ToList();
        Assert.Equal("Customer logo wall", column[1].Title);
        Assert.Equal(Enumerable.Range(0, column.Count), column.Select(t => t.SortOrder));
    }

    [Fact]
    public async Task Sending_a_task_back_from_review_raises_the_review_cycle()
    {
        var client = await api.SignInAsAsync("Naledi Khumalo");
        var changesRequested = (await GetStatusesAsync(client, "Design")).Single(s => s.Name == "Changes Requested");
        var task = (await GetTasksAsync(client, "Design")).Single(t => t.Title == "Office map illustration");

        var response = await client.PostAsJsonAsync($"/api/tasks/{task.Id}/move", new MoveTaskRequest(changesRequested.Id, 0), ApiFactory.Json, _ct);
        var moved = await response.Content.ReadFromJsonAsync<TaskDto>(ApiFactory.Json, _ct);

        Assert.Equal(1, task.ReviewCycle);
        Assert.Equal(2, moved!.ReviewCycle);
    }

    [Fact]
    public async Task Member_can_edit_their_own_task_but_not_someone_elses()
    {
        var client = await api.SignInAsAsync("Jason van Wyk");
        var tasks = await GetTasksAsync(client, "Design");
        var own = tasks.Single(t => t.Title == "Billboard adaptation");
        var others = tasks.Single(t => t.Title == "Icon set refresh");

        var ownResponse = await client.PutAsJsonAsync($"/api/tasks/{own.Id}", ToUpdate(own) with { EstimateHours = 10 }, ApiFactory.Json, _ct);
        var othersResponse = await client.PutAsJsonAsync($"/api/tasks/{others.Id}", ToUpdate(others), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.OK, ownResponse.StatusCode);
        Assert.Equal(10, (await ownResponse.Content.ReadFromJsonAsync<TaskDto>(ApiFactory.Json, _ct))!.EstimateHours);
        Assert.Equal(HttpStatusCode.Forbidden, othersResponse.StatusCode);
    }

    [Fact]
    public async Task Member_cannot_reassign_their_own_task()
    {
        var client = await api.SignInAsAsync("Jason van Wyk");
        var task = (await GetTasksAsync(client, "Design")).Single(t => t.Title == "Campaign key visual");
        var designId = await GetTeamIdAsync(client, "Design");
        var people = await client.GetFromJsonAsync<List<PersonDto>>($"/api/teams/{designId}/people", ApiFactory.Json, _ct);
        var colleague = people!.First(p => p.Id != task.AssigneePersonId);

        var response = await client.PutAsJsonAsync($"/api/tasks/{task.Id}", ToUpdate(task) with { AssigneePersonId = colleague.Id }, ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var after = (await GetTasksAsync(client, "Design")).Single(t => t.Id == task.Id);
        Assert.Equal(task.AssigneePersonId, after.AssigneePersonId);
    }

    [Fact]
    public async Task Update_without_a_title_returns_400()
    {
        var client = await api.SignInAsAsync("Naledi Khumalo");
        var task = (await GetTasksAsync(client, "Design")).Single(t => t.Title == "CEO letter spread");

        var response = await client.PutAsJsonAsync($"/api/tasks/{task.Id}", ToUpdate(task) with { Title = " " }, ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Member_cannot_see_another_teams_tasks()
    {
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var designId = await GetTeamIdAsync(naledi, "Design");
        var thabo = await api.SignInAsAsync("Thabo Mahlangu");

        var response = await thabo.GetAsync($"/api/teams/{designId}/tasks", _ct);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Admin_adds_a_task_for_anyone_at_the_end_of_the_chosen_column()
    {
        var client = await api.SignInAsAsync("Megan Botha");
        var teamId = await GetTeamIdAsync(client, "Marketing");
        var published = (await GetStatusesAsync(client, "Marketing")).Single(s => s.Name == "Published");
        var project = (await GetProjectsAsync(client, teamId))[0];
        var chloe = (await GetPeopleAsync(client, teamId)).Single(p => p.Name == "Chloe Adams");

        var response = await client.PostAsJsonAsync($"/api/teams/{teamId}/tasks",
            new CreateTaskRequest(" Launch recap ", project.Id, published.Id, chloe.Id, 6, null, null), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = (await response.Content.ReadFromJsonAsync<TaskDto>(ApiFactory.Json, _ct))!;
        Assert.Equal(("Launch recap", published.Id, chloe.Id), (created.Title, created.StatusId, created.AssigneePersonId));
        var column = (await GetTasksAsync(client, "Marketing")).Where(t => t.StatusId == published.Id).OrderBy(t => t.SortOrder);
        Assert.Equal(created.Id, column.Last().Id);
    }

    [Fact]
    public async Task Member_adds_a_task_for_themselves_in_the_first_column()
    {
        var client = await api.SignInAsAsync("Ethan Pillay");
        var teamId = await GetTeamIdAsync(client, "Design");
        var people = await GetPeopleAsync(client, teamId);
        var project = (await GetProjectsAsync(client, teamId))[0];
        var create = new CreateTaskRequest("Icon audit", project.Id, null, people.Single(p => p.Name == "Ethan Pillay").Id, null, null, null);

        var own = await client.PostAsJsonAsync($"/api/teams/{teamId}/tasks", create, ApiFactory.Json, _ct);
        var forColleague = await client.PostAsJsonAsync($"/api/teams/{teamId}/tasks",
            create with { AssigneePersonId = people.Single(p => p.Name == "Lerato Mokoena").Id }, ApiFactory.Json, _ct);
        var unassigned = await client.PostAsJsonAsync($"/api/teams/{teamId}/tasks", create with { AssigneePersonId = null }, ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.Created, own.StatusCode);
        var created = (await own.Content.ReadFromJsonAsync<TaskDto>(ApiFactory.Json, _ct))!;
        Assert.Equal("To Do", (await GetStatusesAsync(client, "Design")).Single(s => s.Id == created.StatusId).Name);
        Assert.Equal(HttpStatusCode.Forbidden, forColleague.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, unassigned.StatusCode);
    }

    [Fact]
    public async Task Adding_a_task_rejects_non_members_triage_and_other_teams_projects()
    {
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var designId = await GetTeamIdAsync(naledi, "Design");
        var marketingId = await GetTeamIdAsync(naledi, "Marketing");
        var triage = (await GetStatusesAsync(naledi, "Design")).Single(s => s.Name == "Triage");
        var designProject = (await GetProjectsAsync(naledi, designId))[0];
        var marketingProject = (await GetProjectsAsync(naledi, marketingId))[0];
        var create = new CreateTaskRequest("Not added", designProject.Id, null, null, null, null, null);
        var david = await api.SignInAsAsync("David Cohen");

        var requester = await david.PostAsJsonAsync($"/api/teams/{designId}/tasks", create, ApiFactory.Json, _ct);
        var inTriage = await naledi.PostAsJsonAsync($"/api/teams/{designId}/tasks", create with { StatusId = triage.Id }, ApiFactory.Json, _ct);
        var otherProject = await naledi.PostAsJsonAsync($"/api/teams/{designId}/tasks", create with { ProjectId = marketingProject.Id }, ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.Forbidden, requester.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, inTriage.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, otherProject.StatusCode);
    }

    private static UpdateTaskRequest ToUpdate(TaskDto task) =>
        new(task.Title, task.Description, task.AssigneePersonId, task.EstimateHours, task.DueDate, task.Link);

    private async Task<Guid> GetTeamIdAsync(HttpClient client, string name)
    {
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);
        return teams!.Single(t => t.Name == name).Id;
    }

    private async Task<List<StatusDto>> GetStatusesAsync(HttpClient client, string team) =>
        (await client.GetFromJsonAsync<List<StatusDto>>($"/api/teams/{await GetTeamIdAsync(client, team)}/statuses", ApiFactory.Json, _ct))!;

    private async Task<List<ProjectDto>> GetProjectsAsync(HttpClient client, Guid teamId) =>
        (await client.GetFromJsonAsync<List<ProjectDto>>($"/api/teams/{teamId}/projects", ApiFactory.Json, _ct))!;

    private async Task<List<PersonDto>> GetPeopleAsync(HttpClient client, Guid teamId) =>
        (await client.GetFromJsonAsync<List<PersonDto>>($"/api/teams/{teamId}/people", ApiFactory.Json, _ct))!;

    private async Task<List<TaskDto>> GetTasksAsync(HttpClient client, string team) =>
        (await client.GetFromJsonAsync<List<TaskDto>>($"/api/teams/{await GetTeamIdAsync(client, team)}/tasks", ApiFactory.Json, _ct))!;
}
