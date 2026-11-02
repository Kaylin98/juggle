using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Allocations;
using Juggle.Api.Features.Jobs;
using Juggle.Api.Features.Teams;
using Juggle.Api.Features.Workflow;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Juggle.Api.Tests;

// Each test sends its own brief, so the jobs it moves through the workflow are its own.
public sealed class WorkflowTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;
    private readonly DateOnly _today = new OrgClock(TimeProvider.System).Today;

    [Fact]
    public async Task Each_role_is_offered_only_the_actions_it_may_take_on_a_new_request()
    {
        var job = await SubmitAsync("Zanele Mthembu");

        var seenBy = new Dictionary<string, IReadOnlyList<WorkflowAction>>();
        foreach (var name in new[] { "Chloe Adams", "Zanele Mthembu", "Naledi Khumalo", "Priya Naidoo", "Megan Botha" })
        {
            var client = await api.SignInAsAsync(name);
            var detail = await client.GetAsync($"/api/jobs/{job.Id}", _ct);
            seenBy[name] = detail.IsSuccessStatusCode
                ? (await detail.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!.Job.Actions
                : [];
        }

        Assert.Equal(
            [WorkflowAction.RequestInformation, WorkflowAction.MarkReady, WorkflowAction.Cancel, WorkflowAction.AllocateAndSchedule],
            seenBy["Chloe Adams"].Order());
        Assert.All(seenBy.Where(s => s.Key != "Chloe Adams"), s => Assert.Empty(s.Value));
    }

    [Fact]
    public async Task Traffic_manager_requests_information_and_the_event_is_recorded()
    {
        var job = await SubmitAsync("Zanele Mthembu");
        var chloe = await api.SignInAsAsync("Chloe Adams");

        var response = await chloe.PostAsJsonAsync($"/api/jobs/{job.Id}/request-information", new MessageRequest("Which sizes?"), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Awaiting Information", (await response.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!.Job.StatusName);
        var events = await EventsAsync(job.Id);
        Assert.Equal((WorkflowAction.RequestInformation, "Which sizes?", "Chloe Adams"), (events[^1].Event.Action, events[^1].Event.Message, events[^1].User));
    }

    [Fact]
    public async Task The_requester_answers_a_question_and_the_job_returns_to_the_traffic_manager()
    {
        var job = await SubmitAsync("Zanele Mthembu");
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var thabo = await api.SignInAsAsync("Thabo Mahlangu");
        await chloe.PostAsJsonAsync($"/api/jobs/{job.Id}/request-information", new MessageRequest("Which sizes?"), ApiFactory.Json, _ct);

        var early = await zanele.PostAsync($"/api/jobs/{job.Id}/mark-ready", null, _ct);
        var asked = (await zanele.GetFromJsonAsync<JobDetailDto>($"/api/jobs/{job.Id}", ApiFactory.Json, _ct))!;
        var wrongPerson = await thabo.PostAsJsonAsync($"/api/jobs/{job.Id}/answer", new MessageRequest("Stories"), ApiFactory.Json, _ct);
        var trafficManagerAnswers = await chloe.PostAsJsonAsync($"/api/jobs/{job.Id}/answer", new MessageRequest("Stories"), ApiFactory.Json, _ct);
        var answered = await zanele.PostAsJsonAsync($"/api/jobs/{job.Id}/answer", new MessageRequest("1080 x 1920"), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.Forbidden, early.StatusCode);
        Assert.Equal([WorkflowAction.Answer], asked.Job.Actions);
        Assert.Equal(("Awaiting Information", "Which sizes?"), (asked.Job.StatusName, asked.History[^1].Message));
        Assert.Equal(HttpStatusCode.Forbidden, wrongPerson.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, trafficManagerAnswers.StatusCode);
        var result = (await answered.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!;
        Assert.Equal("Awaiting Traffic Review", result.Job.StatusName);
        Assert.Equal(
            [(WorkflowAction.Submit, "Zanele Mthembu"), (WorkflowAction.RequestInformation, "Chloe Adams"), (WorkflowAction.Answer, "Zanele Mthembu")],
            result.History.Select(e => (e.Action, e.UserName)));
        Assert.Equal("1080 x 1920", result.History[^1].Message);
        // Back in the traffic manager's hands, who can ask again, mark it ready or book it.
        var chloeSees = (await chloe.GetFromJsonAsync<JobDetailDto>($"/api/jobs/{job.Id}", ApiFactory.Json, _ct))!.Job.Actions;
        Assert.Contains(WorkflowAction.MarkReady, chloeSees);
    }

    [Fact]
    public async Task Answering_a_job_that_was_not_asked_a_question_is_refused()
    {
        var job = await SubmitAsync("Zanele Mthembu");
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        var response = await zanele.PostAsJsonAsync($"/api/jobs/{job.Id}/answer", new MessageRequest("Hello"), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task The_designer_starts_the_job_and_submits_artwork_versions()
    {
        var job = await SubmitAsync("Zanele Mthembu");
        await ScheduleAsync(job, "Priya Naidoo");
        var priya = await api.SignInAsAsync("Priya Naidoo");

        var scheduled = (await priya.GetFromJsonAsync<JobDetailDto>($"/api/jobs/{job.Id}", ApiFactory.Json, _ct))!.Job;
        var early = await priya.PostAsJsonAsync($"/api/jobs/{job.Id}/submit-artwork", new SubmitArtworkRequest("https://example.com/v1", null), ApiFactory.Json, _ct);
        var started = await priya.PostAsync($"/api/jobs/{job.Id}/start", null, _ct);
        var badLink = await priya.PostAsJsonAsync($"/api/jobs/{job.Id}/submit-artwork", new SubmitArtworkRequest("not a link", null), ApiFactory.Json, _ct);
        var submitted = await priya.PostAsJsonAsync($"/api/jobs/{job.Id}/submit-artwork", new SubmitArtworkRequest("https://example.com/v1", " First look "), ApiFactory.Json, _ct);

        Assert.Equal([WorkflowAction.Start], scheduled.Actions);
        Assert.Equal(HttpStatusCode.BadRequest, early.StatusCode);
        Assert.Equal("In Progress", (await started.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!.Job.StatusName);
        Assert.Equal(HttpStatusCode.BadRequest, badLink.StatusCode);
        var result = (await submitted.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!;
        Assert.Equal("Awaiting Design Approval", result.Job.StatusName);
        var version = Assert.Single(result.Artwork);
        Assert.Equal((1, "https://example.com/v1", "First look", "Priya Naidoo"), (version.Version, version.Url, version.Note, version.SubmittedByName));
        Assert.Equal(WorkflowAction.SubmitForApproval, result.History[^1].Action);
    }

    [Fact]
    public async Task Only_the_jobs_designer_works_on_it_and_the_requester_sees_no_artwork()
    {
        var job = await SubmitAsync("Zanele Mthembu");
        await ScheduleAsync(job, "Priya Naidoo");
        var priya = await api.SignInAsAsync("Priya Naidoo");
        await priya.PostAsync($"/api/jobs/{job.Id}/start", null, _ct);
        await priya.PostAsJsonAsync($"/api/jobs/{job.Id}/submit-artwork", new SubmitArtworkRequest("https://example.com/v1", null), ApiFactory.Json, _ct);

        foreach (var name in new[] { "Ethan Pillay", "Chloe Adams", "Zanele Mthembu" })
        {
            var other = await api.SignInAsAsync(name);
            var start = await other.PostAsync($"/api/jobs/{job.Id}/start", null, _ct);
            var submit = await other.PostAsJsonAsync($"/api/jobs/{job.Id}/submit-artwork", new SubmitArtworkRequest("https://example.com/v2", null), ApiFactory.Json, _ct);
            Assert.Equal((HttpStatusCode.Forbidden, HttpStatusCode.Forbidden), (start.StatusCode, submit.StatusCode));
        }

        var requesterView = (await (await api.SignInAsAsync("Zanele Mthembu")).GetFromJsonAsync<JobDetailDto>($"/api/jobs/{job.Id}", ApiFactory.Json, _ct))!;
        var trafficManagerView = (await (await api.SignInAsAsync("Chloe Adams")).GetFromJsonAsync<JobDetailDto>($"/api/jobs/{job.Id}", ApiFactory.Json, _ct))!;
        Assert.Empty(requesterView.Artwork);
        Assert.Single(trafficManagerView.Artwork);
    }

    [Fact]
    public async Task Only_the_head_of_design_decides_on_the_design_and_the_job_waits_in_their_queue()
    {
        var job = await AwaitingDesignApprovalAsync();
        var naledi = await api.SignInAsAsync("Naledi Khumalo");

        foreach (var name in new[] { "Chloe Adams", "Zanele Mthembu", "Priya Naidoo", "Megan Botha" })
        {
            var other = await api.SignInAsAsync(name);
            var approve = await other.PostAsJsonAsync($"/api/jobs/{job.Id}/approve-design", new CommentRequest(null), ApiFactory.Json, _ct);
            var queue = await other.GetFromJsonAsync<List<QueuedJobDto>>("/api/jobs/approvals", ApiFactory.Json, _ct);
            Assert.Equal(HttpStatusCode.Forbidden, approve.StatusCode);
            Assert.DoesNotContain(queue!, q => q.Job.Id == job.Id);
        }

        var queued = (await naledi.GetFromJsonAsync<List<QueuedJobDto>>("/api/jobs/approvals", ApiFactory.Json, _ct))!.Single(q => q.Job.Id == job.Id);
        Assert.Equal("https://example.com/v1", queued.Artwork!.Url);
        Assert.Equal([WorkflowAction.ApproveDesign, WorkflowAction.SendBack], queued.Job.Actions.Order());
    }

    [Fact]
    public async Task Sending_the_design_back_needs_a_comment_and_the_next_version_goes_round_again()
    {
        var job = await AwaitingDesignApprovalAsync();
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var priya = await api.SignInAsAsync("Priya Naidoo");
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        var noComment = await naledi.PostAsJsonAsync($"/api/jobs/{job.Id}/send-back", new CommentRequest("  "), ApiFactory.Json, _ct);
        var sentBack = await naledi.PostAsJsonAsync($"/api/jobs/{job.Id}/send-back", new CommentRequest("Logo is too small"), ApiFactory.Json, _ct);
        var second = await priya.PostAsJsonAsync($"/api/jobs/{job.Id}/submit-artwork", new SubmitArtworkRequest("https://example.com/v2", null), ApiFactory.Json, _ct);
        var beforeApproval = (await zanele.GetFromJsonAsync<JobDetailDto>($"/api/jobs/{job.Id}", ApiFactory.Json, _ct))!;
        var approved = await naledi.PostAsJsonAsync($"/api/jobs/{job.Id}/approve-design", new CommentRequest("Better"), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.BadRequest, noComment.StatusCode);
        Assert.Equal("Design Changes Required", (await sentBack.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!.Job.StatusName);
        Assert.Equal(["Version 2"], [(await second.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!.History[^1].Message]);
        // Nothing has reached the marketing manager yet.
        Assert.Empty(beforeApproval.Artwork);
        var result = (await approved.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!;
        Assert.Equal("Awaiting Marketing Approval", result.Job.StatusName);
        Assert.Equal(
            [(ApprovalStage.Design, ApprovalDecision.ChangesRequested, 1, "Naledi Khumalo", "Logo is too small"),
             (ApprovalStage.Design, ApprovalDecision.Approved, 2, "Naledi Khumalo", "Better")],
            result.Approvals.Select(a => (a.Stage, a.Decision, a.Version!.Value, a.ReviewerName, a.Comment!)));
        // The marketing manager sees only the approved version, and the job is in their queue with it.
        var seen = (await zanele.GetFromJsonAsync<JobDetailDto>($"/api/jobs/{job.Id}", ApiFactory.Json, _ct))!;
        Assert.Equal([2], seen.Artwork.Select(a => a.Version));
        var queued = (await zanele.GetFromJsonAsync<List<QueuedJobDto>>("/api/jobs/approvals", ApiFactory.Json, _ct))!.Single(q => q.Job.Id == job.Id);
        Assert.Equal("https://example.com/v2", queued.Artwork!.Url);
    }

    [Fact]
    public async Task The_requester_approves_the_artwork_and_closes_the_job()
    {
        var job = await AwaitingMarketingApprovalAsync();
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var early = await zanele.PostAsync($"/api/jobs/{job.Id}/close", null, _ct);

        var approved = await zanele.PostAsJsonAsync($"/api/jobs/{job.Id}/approve-marketing", new CommentRequest("Love it"), ApiFactory.Json, _ct);
        var closed = await zanele.PostAsync($"/api/jobs/{job.Id}/close", null, _ct);

        Assert.Equal(HttpStatusCode.BadRequest, early.StatusCode);
        var ready = (await approved.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!;
        Assert.Equal("Approved / Ready to Close", ready.Job.StatusName);
        Assert.Contains(WorkflowAction.Close, ready.Job.Actions);
        var result = (await closed.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!;
        Assert.Equal(("Closed / Completed", JobStatusKind.Done), (result.Job.StatusName, result.Job.StatusKind));
        Assert.Empty(result.Job.Actions);
        Assert.Equal((ApprovalStage.Marketing, ApprovalDecision.Approved, "Zanele Mthembu", "Love it"), (result.Approvals[^1].Stage, result.Approvals[^1].Decision, result.Approvals[^1].ReviewerName, result.Approvals[^1].Comment));
        Assert.Equal(WorkflowAction.Close, result.History[^1].Action);
        await using var scope = api.Services.CreateAsyncScope();
        var stored = await scope.ServiceProvider.GetRequiredService<JuggleDbContext>().Jobs.IgnoreQueryFilters().SingleAsync(j => j.Id == job.Id, _ct);
        Assert.NotNull(stored.ClosedAt);
        Assert.NotNull(stored.ClosedByUserId);
    }

    [Fact]
    public async Task A_stakeholders_approval_is_recorded_by_the_requester_with_who_when_and_the_evidence()
    {
        var job = await AwaitingMarketingApprovalAsync();
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var decidedOn = _today.AddDays(-1);

        var needs = await zanele.PostAsJsonAsync($"/api/jobs/{job.Id}/needs-business-approval", new MessageRequest("Sales must sign off the offer"), ApiFactory.Json, _ct);
        var noName = await zanele.PostAsJsonAsync($"/api/jobs/{job.Id}/record-business-approval", new { DecidedOn = decidedOn, StakeholderName = " " }, ApiFactory.Json, _ct);
        var future = await zanele.PostAsJsonAsync($"/api/jobs/{job.Id}/record-business-approval", new BusinessApprovalRequest("Sales", _today.AddDays(1), null, null), ApiFactory.Json, _ct);
        var recorded = await zanele.PostAsJsonAsync(
            $"/api/jobs/{job.Id}/record-business-approval",
            new BusinessApprovalRequest(" Sales ", decidedOn, "Approved by email", "https://example.com/email"), ApiFactory.Json, _ct);

        Assert.Equal("Awaiting Business Approval", (await needs.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!.Job.StatusName);
        Assert.Equal((HttpStatusCode.BadRequest, HttpStatusCode.BadRequest), (noName.StatusCode, future.StatusCode));
        var result = (await recorded.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!;
        Assert.Equal("Approved / Ready to Close", result.Job.StatusName);
        var approval = result.Approvals[^1];
        Assert.Equal(
            (ApprovalStage.Business, ApprovalDecision.Approved, "Sales", decidedOn, "Approved by email", "https://example.com/email", "Zanele Mthembu"),
            (approval.Stage, approval.Decision, approval.StakeholderName, approval.DecidedOn, approval.Comment, approval.Link, approval.ReviewerName));
    }

    [Fact]
    public async Task Only_the_requester_decides_for_marketing_and_nobody_else_closes()
    {
        var job = await AwaitingMarketingApprovalAsync();

        foreach (var name in new[] { "Thabo Mahlangu", "Chloe Adams", "Naledi Khumalo", "Priya Naidoo" })
        {
            var other = await api.SignInAsAsync(name);
            var responses = new[]
            {
                await other.PostAsJsonAsync($"/api/jobs/{job.Id}/approve-marketing", new CommentRequest(null), ApiFactory.Json, _ct),
                await other.PostAsJsonAsync($"/api/jobs/{job.Id}/needs-business-approval", new MessageRequest("Sales"), ApiFactory.Json, _ct),
                await other.PostAsync($"/api/jobs/{job.Id}/close", null, _ct),
            };
            Assert.All(responses, r => Assert.Equal(HttpStatusCode.Forbidden, r.StatusCode));
        }
    }

    [Fact]
    public async Task Marking_ready_moves_a_new_request_to_awaiting_allocation_and_only_once()
    {
        var job = await SubmitAsync("Zanele Mthembu");
        var chloe = await api.SignInAsAsync("Chloe Adams");

        var first = await chloe.PostAsync($"/api/jobs/{job.Id}/mark-ready", null, _ct);
        var again = await chloe.PostAsync($"/api/jobs/{job.Id}/mark-ready", null, _ct);

        Assert.Equal("Awaiting Allocation", (await first.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!.Job.StatusName);
        Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode);
    }

    [Fact]
    public async Task Actions_are_refused_for_roles_without_the_capability()
    {
        var job = await SubmitAsync("Zanele Mthembu");
        foreach (var name in new[] { "Zanele Mthembu", "Priya Naidoo", "Naledi Khumalo" })
        {
            var client = await api.SignInAsAsync(name);

            var markReady = await client.PostAsync($"/api/jobs/{job.Id}/mark-ready", null, _ct);
            var cancel = await client.PostAsJsonAsync($"/api/jobs/{job.Id}/cancel", new MessageRequest("No"), ApiFactory.Json, _ct);

            // Priya sees only jobs she is the designer of, so for her the job does not open.
            Assert.Equal((HttpStatusCode.Forbidden, HttpStatusCode.Forbidden), (markReady.StatusCode, cancel.StatusCode));
        }
    }

    [Fact]
    public async Task Cancelling_needs_a_reason_and_leaves_the_job_cancelled()
    {
        var job = await SubmitAsync("Zanele Mthembu");
        var chloe = await api.SignInAsAsync("Chloe Adams");

        var noReason = await chloe.PostAsJsonAsync($"/api/jobs/{job.Id}/cancel", new { Message = " " }, ApiFactory.Json, _ct);
        var cancelled = await chloe.PostAsJsonAsync($"/api/jobs/{job.Id}/cancel", new MessageRequest("Duplicate brief"), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.BadRequest, noReason.StatusCode);
        var result = (await cancelled.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!.Job;
        Assert.Equal(("Cancelled", JobStatusKind.Cancelled), (result.StatusName, result.StatusKind));
        Assert.Empty(result.Actions);
    }

    [Fact]
    public async Task Allocate_and_schedule_books_the_designer_and_reports_the_warnings()
    {
        var job = await SubmitAsync("Zanele Mthembu");
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var ethan = await StudioPersonAsync(chloe, "Ethan Pillay");
        // Starting two weeks after the required date, so the booking ends late.
        var start = _today.AddDays(7 * 14);
        start = start.AddDays((8 - (int)start.DayOfWeek) % 7);

        var response = await chloe.PostAsJsonAsync(
            $"/api/jobs/{job.Id}/allocate", new AllocateRequest(ethan, start, start.AddDays(2), 4, 12), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = (await response.Content.ReadFromJsonAsync<AllocatedJobDto>(ApiFactory.Json, _ct))!;
        Assert.Equal(
            ("Scheduled", "Ethan Pillay", 12m, start, start.AddDays(2), 12m, true),
            (result.Job.Job.StatusName, result.Job.Job.DesignerName, result.Job.Job.EstimateHours, result.Job.Job.PlannedStartDate,
                result.Job.Job.ExpectedCompletionDate, result.Job.Job.BookedHours, result.AfterRequiredDate));
        Assert.Empty(result.ClashDays);
        var events = await EventsAsync(job.Id);
        Assert.Equal(WorkflowAction.AllocateAndSchedule, events[^1].Event.Action);
    }

    [Fact]
    public async Task Allocating_over_capacity_still_schedules_and_lists_the_clash_days()
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var lerato = await StudioPersonAsync(chloe, "Lerato Mokoena");
        var start = _today.AddDays(7 * 22);
        start = start.AddDays((8 - (int)start.DayOfWeek) % 7);
        var first = await SubmitAsync("Zanele Mthembu");
        var second = await SubmitAsync("Zanele Mthembu");
        await chloe.PostAsJsonAsync($"/api/jobs/{first.Id}/allocate", new AllocateRequest(lerato, start, start, 6, 6), ApiFactory.Json, _ct);

        var response = await chloe.PostAsJsonAsync($"/api/jobs/{second.Id}/allocate", new AllocateRequest(lerato, start, start, 4, 4), ApiFactory.Json, _ct);

        var result = (await response.Content.ReadFromJsonAsync<AllocatedJobDto>(ApiFactory.Json, _ct))!;
        Assert.Equal("Scheduled", result.Job.Job.StatusName);
        Assert.Equal([start], result.ClashDays);
    }

    [Fact]
    public async Task Allocating_a_job_that_is_already_scheduled_is_refused()
    {
        var job = await SubmitAsync("Zanele Mthembu");
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var priya = await StudioPersonAsync(chloe, "Priya Naidoo");
        var start = _today.AddDays(7 * 26);
        start = start.AddDays((8 - (int)start.DayOfWeek) % 7);
        var request = new AllocateRequest(priya, start, start, 4, 4);
        await chloe.PostAsJsonAsync($"/api/jobs/{job.Id}/allocate", request, ApiFactory.Json, _ct);

        var again = await chloe.PostAsJsonAsync($"/api/jobs/{job.Id}/allocate", request, ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode);
        Assert.Single((await chloe.GetFromJsonAsync<JobDetailDto>($"/api/jobs/{job.Id}", ApiFactory.Json, _ct))!.Job.Bookings);
    }

    [Fact]
    public async Task Moving_a_booking_reassigns_and_reschedules_the_job_and_logs_both()
    {
        var job = await SubmitAsync("Zanele Mthembu");
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var ethan = await StudioPersonAsync(chloe, "Ethan Pillay");
        var amahle = await StudioPersonAsync(chloe, "Amahle Dlamini");
        var start = _today.AddDays(7 * 32);
        start = start.AddDays((8 - (int)start.DayOfWeek) % 7);
        await chloe.PostAsJsonAsync($"/api/jobs/{job.Id}/allocate", new AllocateRequest(ethan, start, start.AddDays(1), 4, 8), ApiFactory.Json, _ct);
        var bookingId = await BookingIdAsync(job.Id);

        var move = await chloe.PutAsJsonAsync(
            $"/api/allocations/{bookingId}", new SaveAllocationRequest(amahle, job.Id, start.AddDays(1), start.AddDays(3), 4, null), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.OK, move.StatusCode);
        var moved = (await chloe.GetFromJsonAsync<JobDetailDto>($"/api/jobs/{job.Id}", ApiFactory.Json, _ct))!.Job;
        Assert.Equal(("Amahle Dlamini", start.AddDays(1), start.AddDays(3)), (moved.DesignerName, moved.PlannedStartDate, moved.ExpectedCompletionDate));
        Assert.Equal(
            [WorkflowAction.Submit, WorkflowAction.AllocateAndSchedule, WorkflowAction.Reassign, WorkflowAction.Reschedule],
            (await EventsAsync(job.Id)).Select(e => e.Event.Action));
    }

    private async Task<JobDto> SubmitAsync(string requester)
    {
        var client = await api.SignInAsAsync(requester);
        var options = await client.GetFromJsonAsync<JobOptionsDto>("/api/jobs/options", ApiFactory.Json, _ct);
        var studio = options!.Teams.Single(t => t.Name == "Design Studio").Id;
        var brief = Briefs.Minimal(studio, options.MyDepartmentId!.Value, "Workflow test", _today.AddDays(14));
        var response = await client.PostAsJsonAsync("/api/jobs", brief, ApiFactory.Json, _ct);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!.Job;
    }

    /// <summary>Books the designer for a day, in a week of their own so the tests do not share capacity.</summary>
    private async Task ScheduleAsync(JobDto job, string designer)
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var person = await StudioPersonAsync(chloe, designer);
        var start = _today.AddDays(7 * 40);
        start = start.AddDays((8 - (int)start.DayOfWeek) % 7);
        var response = await chloe.PostAsJsonAsync($"/api/jobs/{job.Id}/allocate", new AllocateRequest(person, start, start, 4, 4), ApiFactory.Json, _ct);
        response.EnsureSuccessStatusCode();
    }

    /// <summary>A new job scheduled to Priya, started, and sent to the head of design with artwork version 1.</summary>
    private async Task<JobDto> AwaitingDesignApprovalAsync()
    {
        var job = await SubmitAsync("Zanele Mthembu");
        await ScheduleAsync(job, "Priya Naidoo");
        var priya = await api.SignInAsAsync("Priya Naidoo");
        (await priya.PostAsync($"/api/jobs/{job.Id}/start", null, _ct)).EnsureSuccessStatusCode();
        (await priya.PostAsJsonAsync($"/api/jobs/{job.Id}/submit-artwork", new SubmitArtworkRequest("https://example.com/v1", null), ApiFactory.Json, _ct)).EnsureSuccessStatusCode();
        return job;
    }

    /// <summary>A job the head of design approved, so it waits for the marketing manager who briefed it.</summary>
    private async Task<JobDto> AwaitingMarketingApprovalAsync()
    {
        var job = await AwaitingDesignApprovalAsync();
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        (await naledi.PostAsJsonAsync($"/api/jobs/{job.Id}/approve-design", new CommentRequest(null), ApiFactory.Json, _ct)).EnsureSuccessStatusCode();
        return job;
    }

    private async Task<Guid> StudioPersonAsync(HttpClient client, string name)
    {
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);
        var people = await client.GetFromJsonAsync<List<PersonDto>>($"/api/teams/{teams!.Single(t => t.Name == "Design Studio").Id}/people", ApiFactory.Json, _ct);
        return people!.Single(p => p.Name == name).Id;
    }

    private async Task<Guid> BookingIdAsync(Guid jobId)
    {
        await using var scope = api.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<JuggleDbContext>();
        return await db.Allocations.IgnoreQueryFilters().Where(a => a.JobId == jobId).Select(a => a.Id).SingleAsync(_ct);
    }

    private async Task<List<(JobEvent Event, string User)>> EventsAsync(Guid jobId)
    {
        await using var scope = api.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<JuggleDbContext>();
        var events = await db.JobEvents.IgnoreQueryFilters()
            .Where(e => e.JobId == jobId)
            .OrderBy(e => e.At).ThenBy(e => e.Id)
            .Join(db.Users.IgnoreQueryFilters(), e => e.UserId, u => u.Id, (e, u) => new { Event = e, u.Name })
            .ToListAsync(_ct);
        return events.Select(e => (e.Event, e.Name)).ToList();
    }
}
