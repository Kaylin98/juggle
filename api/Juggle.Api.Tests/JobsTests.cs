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
        var created = (await response.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!;
        var fetched = (await zanele.GetFromJsonAsync<JobDetailDto>($"/api/jobs/{created.Job.Id}", ApiFactory.Json, _ct))!.Job;

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        // DJI, the first of the brands she manages, is her default brand. Its seeded jobs end at 0142.
        Assert.Equal(("New Request", "Design Studio", "DJI", "Zanele Mthembu"), (fetched.StatusName, fetched.TeamName, fetched.Department, fetched.RequesterName));
        Assert.Matches(@"^DJI0\d{3}_Q\d'\d{2}_Roadshow deck$", fetched.Code);
        Assert.True(int.Parse(fetched.Code[3..7], CultureInfo.InvariantCulture) >= 143);
        Assert.Equal(("Gift ideas for travellers.", "#5b8def"), (fetched.Purpose, fetched.Colour));
    }

    [Fact]
    public async Task The_brief_keeps_every_section_of_the_template()
    {
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var sent = await NewBriefAsync(zanele, "Summer Holiday Sale");

        var response = await zanele.PostAsJsonAsync("/api/jobs", sent, ApiFactory.Json, _ct);
        var id = (await response.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!.Job.Id;
        var (job, brief, _, _, _, _) = (await zanele.GetFromJsonAsync<JobDetailDto>($"/api/jobs/{id}", ApiFactory.Json, _ct))!;

        // A. Job information, with the text trimmed.
        Assert.Equal(("Summer Holiday Sale", "Summer 2027", JobCategory.Promotion, "DJI0141_Q1'27_Black Friday", _today.AddDays(14), Priority.High),
            (job.Title, brief.Campaign, brief.Category, brief.RevisesJobCode, job.RequiredDate, job.Priority));
        // B, D and F.
        Assert.Equal(sent.Objectives, brief.Objectives);
        Assert.Equal(sent.Guidelines with { CreativeInstructions = null }, brief.Guidelines);
        Assert.Equal("Call before you start.", brief.AdditionalInformation);
        // C. Several deliverables, each with its type, specifications and deadline, in order.
        Assert.Equal(sent.Deliverables, job.Deliverables);
        // E. Supporting links, in order.
        Assert.Equal(sent.Links, brief.Links);
    }

    [Fact]
    public async Task Each_brief_takes_the_brands_next_number()
    {
        // Thabo's first brand is CGA, which has no seeded jobs and no other test sends briefs for.
        var first = await SubmitAsync("Thabo Mahlangu", "Store opening");
        var second = await SubmitAsync("Thabo Mahlangu", "Store opening");

        var quarter = JobCodes.FinancialQuarter(_today.AddDays(14), 10);
        Assert.Equal($"CGA0001_Q{quarter.Quarter}'{quarter.Year % 100}_Store opening", first.Code);
        Assert.Equal($"CGA0002_Q{quarter.Quarter}'{quarter.Year % 100}_Store opening", second.Code);
    }

    [Fact]
    public async Task Briefs_sent_at_once_never_share_a_number()
    {
        // Werner's first brand is ARP, which has no seeded jobs and no other test sends briefs for.
        var werner = await api.SignInAsAsync("Werner Steyn");
        var brief = await NewBriefAsync(werner, "Parallel brief");

        var responses = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => werner.PostAsJsonAsync("/api/jobs", brief, ApiFactory.Json, _ct)));
        var codes = await Task.WhenAll(responses.Select(async r => (await r.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!.Job.Code));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.Created, r.StatusCode));
        Assert.Equal(["ARP0001", "ARP0002", "ARP0003", "ARP0004", "ARP0005", "ARP0006"], codes.Select(c => c[..7]).Order());
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

        var deliverable = valid.Deliverables[0];
        CreateJobRequest[] invalids =
        [
            valid with { Title = "" },
            valid with { RequiredDate = _today.AddDays(-1) },
            valid with { TeamId = Guid.Empty },
            valid with { DepartmentId = Guid.Empty },
            valid with { Deliverables = [deliverable with { Description = "" }] },
            valid with { Deliverables = [deliverable with { Description = new string('x', 201) }] },
            valid with { Deliverables = [deliverable with { DueDate = _today.AddDays(-1) }] },
            valid with { Deliverables = [.. Enumerable.Repeat(deliverable, 21)] },
            valid with { Objectives = valid.Objectives with { Objective = new string('x', 1001) } },
            valid with { Guidelines = valid.Guidelines with { LegalDisclaimers = new string('x', 1001) } },
            valid with { Links = [new BriefLink("not a link", null)] },
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

    /// <summary>A brief with every section of the template filled in, to the user's first brand (DJI for anyone else).</summary>
    private async Task<CreateJobRequest> NewBriefAsync(HttpClient client, string title)
    {
        var options = await client.GetFromJsonAsync<JobOptionsDto>("/api/jobs/options", ApiFactory.Json, _ct);
        var studio = options!.Teams.Single(t => t.Name == "Design Studio").Id;
        var brand = options.MyDepartmentId ?? options.Departments.Single(d => d.Name == "DJI").Id;
        return new CreateJobRequest(
            studio, brand, title, " Summer 2027 ", JobCategory.Promotion, "DJI0141_Q1'27_Black Friday", _today.AddDays(14), Priority.High,
            new BriefObjectives(
                "Gift ideas for travellers.", "Grow summer sales by 20%.", "Families planning a trip.", "Capture the whole holiday.",
                "Takealot, Instagram, in store", "Sell-out of the summer bundles."),
            [
                new BriefDeliverable(DeliverableType.WebsiteBanner, "Takealot banners", "1200 x 628 and 300 x 250, JPG", _today.AddDays(10)),
                new BriefDeliverable(DeliverableType.SocialMedia, "Instagram stories", "1080 x 1920, 3 frames", null),
                new BriefDeliverable(DeliverableType.InStore, "Shelf wobblers", null, _today.AddDays(12)),
            ],
            new CreativeGuidelines(
                "Bright and sunny.", "DJI CI 2026", "Brand blue, Space Grotesk", "Last year's summer look", "From R4 999",
                "DJI and Takealot", "Mini 4 Pro and Osmo Pocket 3", "While stocks last", "   "),
            [new BriefLink("https://example.sharepoint.com/summer", "Brief folder"), new BriefLink("https://example.com/guidelines.pdf", null)],
            "Call before you start.");
    }

    private async Task<JobDto> SubmitAsync(string requester, string title)
    {
        var client = await api.SignInAsAsync(requester);
        var response = await client.PostAsJsonAsync("/api/jobs", await NewBriefAsync(client, title), ApiFactory.Json, _ct);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!.Job;
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
