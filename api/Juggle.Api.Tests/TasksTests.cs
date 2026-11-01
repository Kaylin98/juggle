using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Features.Allocations;
using Juggle.Api.Features.Capacity;
using Juggle.Api.Features.Tasks;
using Juggle.Api.Features.Teams;

namespace Juggle.Api.Tests;

// Tests share one seeded database, so each test moves or edits a different task.
public sealed class TasksTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;

    [Fact]
    public async Task Studio_has_its_columns()
    {
        var client = await api.SignInAsAsync("Chloe Adams");

        var studio = await GetStatusesAsync(client, "Design Studio");

        Assert.Equal(["Triage", "Briefed in", "Working on it", "Feedback needed", "Awaiting approval", "Done"], studio.Select(s => s.Name));
    }

    [Fact]
    public async Task Move_puts_the_task_at_the_index_and_persists()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var feedback = (await GetStatusesAsync(client, "Design Studio")).Single(s => s.Name == "Feedback needed");
        var task = (await GetTasksAsync(client, "Design Studio")).Single(t => t.Title == "Social carousel");

        var response = await client.PostAsJsonAsync($"/api/tasks/{task.Id}/move", new MoveTaskRequest(feedback.Id, 1), ApiFactory.Json, _ct);
        response.EnsureSuccessStatusCode();

        var column = (await GetTasksAsync(client, "Design Studio")).Where(t => t.StatusId == feedback.Id).OrderBy(t => t.SortOrder).ToList();
        Assert.Equal("Social carousel", column[1].Title);
        Assert.Equal(Enumerable.Range(0, column.Count), column.Select(t => t.SortOrder));
    }

    [Fact]
    public async Task Sending_a_task_back_from_review_raises_the_review_cycle()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var workingOnIt = (await GetStatusesAsync(client, "Design Studio")).Single(s => s.Name == "Working on it");
        var task = (await GetTasksAsync(client, "Design Studio")).Single(t => t.Title == "A4 insert: Incredible Connection");

        var response = await client.PostAsJsonAsync($"/api/tasks/{task.Id}/move", new MoveTaskRequest(workingOnIt.Id, 0), ApiFactory.Json, _ct);
        var moved = await response.Content.ReadFromJsonAsync<TaskDto>(ApiFactory.Json, _ct);

        Assert.Equal(1, task.ReviewCycle);
        Assert.Equal(2, moved!.ReviewCycle);
    }

    [Fact]
    public async Task Brand_manager_approves_a_card_to_the_top_of_done()
    {
        // Marketing managers no longer see the board (D66), so the card is read as the Traffic Manager.
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var statuses = await GetStatusesAsync(chloe, "Design Studio");
        var card = (await GetTasksAsync(chloe, "Design Studio")).Single(t => t.Title == "A4 insert: Cameraland");
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        var response = await zanele.PostAsync($"/api/tasks/{card.Id}/approve", null, _ct);
        var approved = await response.Content.ReadFromJsonAsync<TaskDto>(ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(("Done", 0, 1), (statuses.Single(s => s.Id == approved!.StatusId).Name, approved!.SortOrder, approved.ReviewCycle));
        // Once approved it is no longer awaiting approval.
        Assert.Equal(HttpStatusCode.BadRequest, (await zanele.PostAsync($"/api/tasks/{card.Id}/approve", null, _ct)).StatusCode);
    }

    [Fact]
    public async Task Requesting_changes_sends_the_card_to_feedback_needed_with_the_comment_and_the_next_round()
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var statuses = await GetStatusesAsync(chloe, "Design Studio");
        var tasks = await GetTasksAsync(chloe, "Design Studio");
        var card = tasks.Single(t => t.Title == "Scooter spec sheets");
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var url = $"/api/tasks/{card.Id}/request-changes";

        Assert.Equal(HttpStatusCode.BadRequest, (await zanele.PostAsJsonAsync(url, new RequestChangesRequest(" "), ApiFactory.Json, _ct)).StatusCode);
        var notAwaiting = tasks.Single(t => t.Title == "iStore banners");
        Assert.Equal(HttpStatusCode.BadRequest,
            (await zanele.PostAsJsonAsync($"/api/tasks/{notAwaiting.Id}/request-changes", new RequestChangesRequest("No"), ApiFactory.Json, _ct)).StatusCode);

        var response = await zanele.PostAsJsonAsync(url, new RequestChangesRequest(" Show the range in km. "), ApiFactory.Json, _ct);
        var sentBack = await response.Content.ReadFromJsonAsync<TaskDto>(ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(("Feedback needed", 0, 2, "Show the range in km."),
            (statuses.Single(s => s.Id == sentBack!.StatusId).Name, sentBack!.SortOrder, sentBack.ReviewCycle, sentBack.Feedback));

        // Picking the changes up does not count the round twice; only leaving Awaiting approval raises it.
        var workingOnIt = statuses.Single(s => s.Name == "Working on it");
        var moved = await (await chloe.PostAsJsonAsync($"/api/tasks/{card.Id}/move", new MoveTaskRequest(workingOnIt.Id, 0), ApiFactory.Json, _ct))
            .Content.ReadFromJsonAsync<TaskDto>(ApiFactory.Json, _ct);
        Assert.Equal(2, moved!.ReviewCycle);
    }

    [Fact]
    public async Task Projects_and_bookings_take_their_brands_colour()
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var studioId = await GetTeamIdAsync(chloe, "Design Studio");
        var projects = await GetProjectsAsync(chloe, studioId);
        var start = new OrgClock(TimeProvider.System).Today.StartOfWeek();
        var schedule = (await chloe.GetFromJsonAsync<CapacityDto>($"/api/capacity?teamId={studioId}&start={start:yyyy-MM-dd}&weeks=4", ApiFactory.Json, _ct))!;

        // One colour per brand (D61): every DJI brief is DJI's blue, on the board and on the schedule.
        Assert.All(projects.GroupBy(p => p.Department), brand => Assert.Single(brand.Select(p => p.Colour).Distinct()));
        Assert.All(projects.Where(p => p.Department == "DJI"), p => Assert.Equal("#5b8def", p.Colour));
        Assert.NotEmpty(schedule.Allocations);
        Assert.All(schedule.Allocations.Where(a => !a.OtherTeam),
            a => Assert.Equal(projects.Single(p => p.Id == a.ProjectId).Colour, a.ProjectColour));
    }

    [Fact]
    public async Task Only_the_brands_manager_approves()
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var goPro = (await GetTasksAsync(chloe, "Design Studio")).Single(t => t.Title == "Bundle packshots");
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        // The Traffic Manager, who does not manage the brand, and another brand's manager.
        Assert.Equal(HttpStatusCode.Forbidden, (await chloe.PostAsync($"/api/tasks/{goPro.Id}/approve", null, _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await zanele.PostAsJsonAsync($"/api/tasks/{goPro.Id}/request-changes", new RequestChangesRequest("No"), ApiFactory.Json, _ct)).StatusCode);
    }

    [Fact]
    public async Task Member_can_edit_their_own_task_but_not_someone_elses()
    {
        var client = await api.SignInAsAsync("Ethan Pillay");
        var tasks = await GetTasksAsync(client, "Design Studio");
        var own = tasks.Single(t => t.Title == "Summit presentation template");
        var others = tasks.Single(t => t.Title == "Campus poster series");

        var ownResponse = await client.PutAsJsonAsync($"/api/tasks/{own.Id}", ToUpdate(own) with { EstimateHours = 10 }, ApiFactory.Json, _ct);
        var othersResponse = await client.PutAsJsonAsync($"/api/tasks/{others.Id}", ToUpdate(others), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.OK, ownResponse.StatusCode);
        Assert.Equal(10, (await ownResponse.Content.ReadFromJsonAsync<TaskDto>(ApiFactory.Json, _ct))!.EstimateHours);
        Assert.Equal(HttpStatusCode.Forbidden, othersResponse.StatusCode);
    }

    [Fact]
    public async Task Member_cannot_reassign_their_own_task()
    {
        var client = await api.SignInAsAsync("Ethan Pillay");
        var task = (await GetTasksAsync(client, "Design Studio")).Single(t => t.Title == "Brand store hero banners");
        var studioId = await GetTeamIdAsync(client, "Design Studio");
        var people = await client.GetFromJsonAsync<List<PersonDto>>($"/api/teams/{studioId}/people", ApiFactory.Json, _ct);
        var colleague = people!.First(p => p.Id != task.AssigneePersonId);

        var response = await client.PutAsJsonAsync($"/api/tasks/{task.Id}", ToUpdate(task) with { AssigneePersonId = colleague.Id }, ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var after = (await GetTasksAsync(client, "Design Studio")).Single(t => t.Id == task.Id);
        Assert.Equal(task.AssigneePersonId, after.AssigneePersonId);
    }

    [Fact]
    public async Task Update_without_a_title_returns_400()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var task = (await GetTasksAsync(client, "Design Studio")).Single(t => t.Title == "Retailer toolkit");

        var response = await client.PutAsJsonAsync($"/api/tasks/{task.Id}", ToUpdate(task) with { Title = " " }, ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Marketing_manager_cannot_see_the_board()
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var studioId = await GetTeamIdAsync(chloe, "Design Studio");
        var thabo = await api.SignInAsAsync("Thabo Mahlangu");

        var response = await thabo.GetAsync($"/api/teams/{studioId}/tasks", _ct);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Traffic_manager_adds_a_task_for_anyone_at_the_end_of_the_chosen_column()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var teamId = await GetTeamIdAsync(client, "Design Studio");
        var done = (await GetStatusesAsync(client, "Design Studio")).Single(s => s.Name == "Done");
        var project = (await GetProjectsAsync(client, teamId))[0];
        var priya = (await GetPeopleAsync(client, teamId)).Single(p => p.Name == "Priya Naidoo");

        var response = await client.PostAsJsonAsync($"/api/teams/{teamId}/tasks",
            new CreateTaskRequest(" Launch recap ", project.Id, done.Id, priya.Id, 6, null, null), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = (await response.Content.ReadFromJsonAsync<TaskDto>(ApiFactory.Json, _ct))!;
        Assert.Equal(("Launch recap", done.Id, priya.Id), (created.Title, created.StatusId, created.AssigneePersonId));
        var column = (await GetTasksAsync(client, "Design Studio")).Where(t => t.StatusId == done.Id).OrderBy(t => t.SortOrder);
        Assert.Equal(created.Id, column.Last().Id);
    }

    [Fact]
    public async Task Member_adds_a_task_for_themselves_in_the_first_column()
    {
        var client = await api.SignInAsAsync("Ethan Pillay");
        var teamId = await GetTeamIdAsync(client, "Design Studio");
        var people = await GetPeopleAsync(client, teamId);
        var project = (await GetProjectsAsync(client, teamId))[0];
        var create = new CreateTaskRequest("Icon audit", project.Id, null, people.Single(p => p.Name == "Ethan Pillay").Id, null, null, null);

        var own = await client.PostAsJsonAsync($"/api/teams/{teamId}/tasks", create, ApiFactory.Json, _ct);
        var forColleague = await client.PostAsJsonAsync($"/api/teams/{teamId}/tasks",
            create with { AssigneePersonId = people.Single(p => p.Name == "Lerato Mokoena").Id }, ApiFactory.Json, _ct);
        var unassigned = await client.PostAsJsonAsync($"/api/teams/{teamId}/tasks", create with { AssigneePersonId = null }, ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.Created, own.StatusCode);
        var created = (await own.Content.ReadFromJsonAsync<TaskDto>(ApiFactory.Json, _ct))!;
        Assert.Equal("Briefed in", (await GetStatusesAsync(client, "Design Studio")).Single(s => s.Id == created.StatusId).Name);
        Assert.Equal(HttpStatusCode.Forbidden, forColleague.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, unassigned.StatusCode);
    }

    [Fact]
    public async Task Adding_a_task_rejects_non_members_triage_and_other_teams_projects()
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var studioId = await GetTeamIdAsync(chloe, "Design Studio");
        var triage = (await GetStatusesAsync(chloe, "Design Studio")).Single(s => s.Name == "Triage");
        var designProject = (await GetProjectsAsync(chloe, studioId))[0];
        var create = new CreateTaskRequest("Not added", designProject.Id, null, null, null, null, null);
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        var requester = await zanele.PostAsJsonAsync($"/api/teams/{studioId}/tasks", create, ApiFactory.Json, _ct);
        var inTriage = await chloe.PostAsJsonAsync($"/api/teams/{studioId}/tasks", create with { StatusId = triage.Id }, ApiFactory.Json, _ct);
        var otherProject = await chloe.PostAsJsonAsync($"/api/teams/{studioId}/tasks", create with { ProjectId = Guid.CreateVersion7() }, ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.Forbidden, requester.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, inTriage.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, otherProject.StatusCode);
    }

    [Fact]
    public async Task Board_shows_the_hours_booked_on_working_days_only()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var studioId = await GetTeamIdAsync(client, "Design Studio");
        var tasks = await GetTasksAsync(client, "Design Studio");
        var task = tasks.Single(t => t.Title == "Retail launch video");
        // Next week from Monday to Sunday: Amahle is on approved leave Monday to Wednesday, so only her working days count.
        var monday = new OrgClock(TimeProvider.System).Today.StartOfWeek().AddDays(7);
        var schedule = await client.GetFromJsonAsync<CapacityDto>(
            $"/api/capacity?teamId={studioId}&start={monday:yyyy-MM-dd}&weeks=1", ApiFactory.Json, _ct);
        var workingDays = schedule!.People.Single(p => p.Id == task.AssigneePersonId).Days.Count(d => d.Capacity > 0);

        var booking = new SaveAllocationRequest(task.AssigneePersonId!.Value, task.ProjectId, task.Id, monday, monday.AddDays(6), 4, null);
        (await client.PostAsJsonAsync("/api/allocations", booking, ApiFactory.Json, _ct)).EnsureSuccessStatusCode();

        var booked = (await GetTasksAsync(client, "Design Studio")).Single(t => t.Id == task.Id);
        Assert.Equal(0, task.BookedHours);
        Assert.Empty(task.Bookings);
        Assert.InRange(workingDays, 1, 4);
        Assert.Equal(4m * workingDays, booked.BookedHours);
        Assert.Equal([new TaskBookingDto(task.AssigneePersonId.Value, "Amahle Dlamini", monday, monday.AddDays(6), 4, 4m * workingDays)], booked.Bookings);
    }

    [Fact]
    public async Task Due_soon_means_open_and_due_within_seven_days_or_overdue()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var tasks = await GetTasksAsync(client, "Design Studio");
        bool DueSoon(string title) => tasks.Single(t => t.Title == title).IsDueSoon;

        Assert.True(DueSoon("iStore banners"));
        Assert.True(DueSoon("Bellyband"));
        Assert.False(DueSoon("Campus poster series"));
        Assert.False(DueSoon("Pop-up stand graphics"));
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
