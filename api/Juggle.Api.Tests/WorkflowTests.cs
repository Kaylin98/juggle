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
