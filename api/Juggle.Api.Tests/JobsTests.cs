using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Allocations;
using Juggle.Api.Features.Capacity;
using Juggle.Api.Features.Jobs;
using Juggle.Api.Features.Teams;
using Juggle.Api.Features.Workflow;

namespace Juggle.Api.Tests;

// Tests share one seeded database, so each test submits its own briefs or reads seeded jobs it does not change.
public sealed class JobsTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;
    private readonly DateOnly _today = new OrgClock(TimeProvider.System).Today;

    [Fact]
    public async Task The_board_has_the_core_groups_columns_and_statuses()
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");

        var workflow = await GetWorkflowAsync(chloe);

        Assert.Equal(["Incoming", "In Design", "In Review", "With Marketing", "Done"], workflow.Columns.Select(c => c.Name));
        Assert.Equal(
            ["New Request", "Awaiting Traffic Review", "Awaiting Information", "Awaiting Allocation", "Awaiting Revision Scheduling"],
            workflow.Columns[0].Statuses.Select(s => s.Name));
        Assert.Equal(17, workflow.Columns.Sum(c => c.Statuses.Count));
        Assert.Equal([JobStatusKind.Done, JobStatusKind.Cancelled], workflow.Columns[^1].Statuses.Select(s => s.Kind));
        // Cards show "Starts <date>" in the statuses Allocate and schedule leads to (D76).
        var statuses = workflow.Columns.SelectMany(c => c.Statuses).ToDictionary(s => s.Id, s => s.Name);
        Assert.Equal(["Revision Scheduled", "Scheduled"], workflow.ScheduledStatusIds.Select(id => statuses[id]).Order());
    }

    [Fact]
    public async Task Marketing_manager_submits_a_brief_that_gets_its_job_id_at_once()
    {
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        var response = await zanele.PostAsJsonAsync("/api/jobs", await NewBriefAsync(zanele, "Roadshow deck"), ApiFactory.Json, _ct);
        var created = (await response.Content.ReadFromJsonAsync<JobDto>(ApiFactory.Json, _ct))!;
        var fetched = await zanele.GetFromJsonAsync<JobDto>($"/api/jobs/{created.Id}", ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        // DJI, the first of the brands she manages, is her default brand. Its seeded jobs end at 0142.
        Assert.Equal(("New Request", "Design Studio", "DJI", "Zanele Mthembu"), (fetched!.StatusName, fetched.TeamName, fetched.Department, fetched.RequesterName));
        Assert.Matches(@"^DJI0\d{3}_Q\d'\d{2}_Roadshow deck$", fetched.Code);
        Assert.True(int.Parse(fetched.Code[3..7], CultureInfo.InvariantCulture) >= 143);
        Assert.Equal(("For the demo.", "#5b8def"), (fetched.MainGoal, fetched.Colour));
        Assert.Equal(["Key visual", "Social tiles x6"], fetched.Deliverables);
    }

    [Fact]
    public async Task Traffic_manager_sees_the_incoming_queue_newest_first()
    {
        var submitted = await SubmitAsync("Ayesha Moosa", "Onboarding video storyboard");
        var chloe = await api.SignInAsAsync("Chloe Adams");

        var incoming = await GetIncomingAsync(chloe);

        Assert.Contains(incoming, j => j.Id == submitted.Id);
        Assert.Equal(incoming.OrderByDescending(j => j.CreatedAt).Select(j => j.Id), incoming.Select(j => j.Id));
        // The seed has two new briefs, one reviewed after an answer, one ready to allocate and one revision (D76).
        Assert.Subset(
            new HashSet<string> { "New Request", "Awaiting Traffic Review", "Awaiting Allocation", "Awaiting Revision Scheduling" },
            incoming.Select(j => j.StatusName).ToHashSet());
        Assert.True(incoming.Count >= 6);
    }

    [Fact]
    public async Task My_jobs_lists_only_the_users_own_newest_first()
    {
        var older = await SubmitAsync("Pieter Smit", "Pieter's first");
        var newer = await SubmitAsync("Pieter Smit", "Pieter's second");
        var someoneElses = await SubmitAsync("Zanele Mthembu", "Zanele's own");
        var pieter = await api.SignInAsAsync("Pieter Smit");

        var mine = (await pieter.GetFromJsonAsync<List<JobDto>>("/api/jobs/mine", ApiFactory.Json, _ct))!;

        Assert.All(mine, j => Assert.Equal("Pieter Smit", j.RequesterName));
        Assert.DoesNotContain(mine, j => j.Id == someoneElses.Id);
        Assert.True(mine.FindIndex(j => j.Id == newer.Id) < mine.FindIndex(j => j.Id == older.Id));
        Assert.Equal(mine.OrderByDescending(j => j.CreatedAt).Select(j => j.Id), mine.Select(j => j.Id));
    }

    [Fact]
    public async Task Designers_see_only_their_own_jobs_and_marketing_managers_only_the_ones_they_briefed()
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var ethan = await api.SignInAsAsync("Ethan Pillay");
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var studioId = await GetTeamIdAsync(chloe);
        var all = await GetBoardAsync(chloe);
        var ethansId = all.First(j => j.DesignerName == "Ethan Pillay").DesignerPersonId;

        var ethansBoard = await GetBoardAsync(ethan);
        var notEthans = all.First(j => j.DesignerPersonId != ethansId && j.RequesterName != "Zanele Mthembu");
        var zanelesJob = all.First(j => j.RequesterName == "Zanele Mthembu");

        Assert.NotEmpty(ethansBoard);
        Assert.All(ethansBoard, j => Assert.Equal(ethansId, j.DesignerPersonId));
        Assert.Equal(all.Count(j => j.DesignerPersonId == ethansId), ethansBoard.Count);
        Assert.Equal(HttpStatusCode.Forbidden, (await ethan.GetAsync($"/api/jobs/{notEthans.Id}", _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await zanele.GetAsync($"/api/teams/{studioId}/jobs", _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await zanele.GetAsync($"/api/jobs/{zanelesJob.Id}", _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await zanele.GetAsync($"/api/jobs/{notEthans.Id}", _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await chloe.GetAsync($"/api/jobs/{Guid.CreateVersion7()}", _ct)).StatusCode);
    }

    [Fact]
    public async Task Jobs_and_their_bookings_take_their_brands_colour()
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var studioId = await GetTeamIdAsync(chloe);
        var jobs = await GetBoardAsync(chloe);
        var start = _today.StartOfWeek();
        var schedule = (await chloe.GetFromJsonAsync<CapacityDto>($"/api/capacity?teamId={studioId}&start={start:yyyy-MM-dd}&weeks=4", ApiFactory.Json, _ct))!;

        // One colour per brand (D61): every DJI job is DJI's blue, on the board and on the schedule.
        Assert.All(jobs.GroupBy(j => j.Department), brand => Assert.Single(brand.Select(j => j.Colour).Distinct()));
        Assert.All(jobs.Where(j => j.Department == "DJI"), j => Assert.Equal("#5b8def", j.Colour));
        Assert.NotEmpty(schedule.Allocations);
        Assert.All(schedule.Allocations, a => Assert.Equal((jobs.Single(j => j.Id == a.JobId).Colour, jobs.Single(j => j.Id == a.JobId).Code), (a.Colour, a.JobCode)));
    }

    [Fact]
    public async Task A_booked_jobs_planned_dates_are_its_first_and_last_booked_days()
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");

        var tiles = (await GetBoardAsync(chloe)).Single(j => j.Title == "Brand Store Product Tiles");

        // Scheduled for Lerato from next Monday: the card shows "Starts" its planned start (D76).
        Assert.Equal("Scheduled", tiles.StatusName);
        Assert.Equal(tiles.Bookings.Min(b => b.StartDate), tiles.PlannedStartDate);
        Assert.Equal(tiles.Bookings.Max(b => b.EndDate), tiles.ExpectedCompletionDate);
        Assert.Equal(_today.StartOfWeek().AddDays(7), tiles.PlannedStartDate);
    }

    [Fact]
    public async Task Board_shows_the_hours_booked_on_working_days_only()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var studioId = await GetTeamIdAsync(client);
        var job = (await GetBoardAsync(client)).Single(j => j.Title == "Retail Launch");
        // Next week from Monday to Sunday: Amahle is on approved leave Monday to Wednesday, so only her working days count.
        var monday = _today.StartOfWeek().AddDays(7);
        var schedule = await client.GetFromJsonAsync<CapacityDto>(
            $"/api/capacity?teamId={studioId}&start={monday:yyyy-MM-dd}&weeks=1", ApiFactory.Json, _ct);
        var workingDays = schedule!.People.Single(p => p.Id == job.DesignerPersonId).Days.Count(d => d.Capacity > 0);

        var booking = new SaveAllocationRequest(job.DesignerPersonId!.Value, job.Id, monday, monday.AddDays(6), 4, null);
        (await client.PostAsJsonAsync("/api/allocations", booking, ApiFactory.Json, _ct)).EnsureSuccessStatusCode();

        var booked = (await GetBoardAsync(client)).Single(j => j.Id == job.Id);
        Assert.InRange(workingDays, 1, 4);
        Assert.Equal(job.BookedHours + (4m * workingDays), booked.BookedHours);
        Assert.Contains(new JobBookingDto(job.DesignerPersonId.Value, "Amahle Dlamini", monday, monday.AddDays(6), 4, 4m * workingDays), booked.Bookings);
    }

    [Fact]
    public async Task Due_soon_means_open_and_required_within_seven_days_or_overdue()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var jobs = await GetBoardAsync(client);
        JobDto Job(string title) => jobs.Single(j => j.Title == title);

        Assert.True(Job("Black Friday iStore Banners").IsDueSoon);
        Assert.True(Job("Black Friday Bellyband").IsDueSoon);
        Assert.True(Job("Black Friday Bellyband").IsOverdue);
        Assert.False(Job("Campus Poster Series").IsDueSoon);
        Assert.False(Job("Festive Pop-up").IsDueSoon);
        Assert.False(Job("Festive Pop-up").IsOverdue);
    }

    [Theory]
    [InlineData("Ethan Pillay")]
    [InlineData("Chloe Adams")]
    public async Task Only_users_who_brief_work_send_briefs(string name)
    {
        // The signed-in user is always the requester (D58, D67), so only roles with SubmitBrief send briefs.
        var client = await api.SignInAsAsync(name);
        var options = await client.GetFromJsonAsync<JobOptionsDto>("/api/jobs/options", ApiFactory.Json, _ct);

        var response = await client.PostAsJsonAsync("/api/jobs", await NewBriefAsync(client, "Studio's own brief"), ApiFactory.Json, _ct);

        Assert.Null(options!.MyDepartmentId);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Invalid_briefs_return_400()
    {
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var valid = await NewBriefAsync(zanele, "Valid");

        CreateJobRequest[] invalids =
        [
            valid with { Title = "" },
            valid with { RequiredDate = _today.AddDays(-1) },
            valid with { TeamId = Guid.Empty },
            valid with { DepartmentId = Guid.Empty },
            valid with { Deliverables = "Banner\n" + new string('x', 201) },
        ];
        foreach (var invalid in invalids)
        {
            var response = await zanele.PostAsJsonAsync("/api/jobs", invalid, ApiFactory.Json, _ct);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }

    [Fact]
    public async Task Options_give_each_team_its_colour()
    {
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        var options = await zanele.GetFromJsonAsync<JobOptionsDto>("/api/jobs/options", ApiFactory.Json, _ct);

        Assert.All(options!.Teams, team => Assert.Matches("^#[0-9a-f]{6}$", team.Colour));
    }

    private async Task<CreateJobRequest> NewBriefAsync(HttpClient client, string title)
    {
        var options = await client.GetFromJsonAsync<JobOptionsDto>("/api/jobs/options", ApiFactory.Json, _ct);
        var studio = options!.Teams.Single(t => t.Name == "Design Studio").Id;
        // The first brand the user manages; DJI for everyone else.
        var brand = options.MyDepartmentId ?? options.Departments.Single(d => d.Name == "DJI").Id;
        return new CreateJobRequest(studio, title, "For the demo.", "Key visual\n- Social tiles x6\n\n", brand, _today.AddDays(14), Priority.High);
    }

    private async Task<JobDto> SubmitAsync(string requester, string title)
    {
        var client = await api.SignInAsAsync(requester);
        var response = await client.PostAsJsonAsync("/api/jobs", await NewBriefAsync(client, title), ApiFactory.Json, _ct);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JobDto>(ApiFactory.Json, _ct))!;
    }

    private async Task<WorkflowDto> GetWorkflowAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<WorkflowDto>("/api/workflow", ApiFactory.Json, _ct))!;

    private async Task<List<JobDto>> GetBoardAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<JobDto>>($"/api/teams/{await GetTeamIdAsync(client)}/jobs", ApiFactory.Json, _ct))!;

    private async Task<List<JobDto>> GetIncomingAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<JobDto>>($"/api/teams/{await GetTeamIdAsync(client)}/incoming", ApiFactory.Json, _ct))!;

    private async Task<Guid> GetTeamIdAsync(HttpClient client)
    {
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);
        return teams!.Single(t => t.Name == "Design Studio").Id;
    }
}
