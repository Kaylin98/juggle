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

    private static UpdateTaskRequest ToUpdate(TaskDto task) =>
        new(task.Title, task.Description, task.AssigneePersonId, task.EstimateHours, task.DueDate, task.Link);

    private async Task<Guid> GetTeamIdAsync(HttpClient client, string name)
    {
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);
        return teams!.Single(t => t.Name == name).Id;
    }

    private async Task<List<StatusDto>> GetStatusesAsync(HttpClient client, string team) =>
        (await client.GetFromJsonAsync<List<StatusDto>>($"/api/teams/{await GetTeamIdAsync(client, team)}/statuses", ApiFactory.Json, _ct))!;

    private async Task<List<TaskDto>> GetTasksAsync(HttpClient client, string team) =>
        (await client.GetFromJsonAsync<List<TaskDto>>($"/api/teams/{await GetTeamIdAsync(client, team)}/tasks", ApiFactory.Json, _ct))!;
}
