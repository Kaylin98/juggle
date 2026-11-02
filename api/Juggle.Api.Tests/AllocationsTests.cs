using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Allocations;
using Juggle.Api.Features.Capacity;
using Juggle.Api.Features.Jobs;
using Juggle.Api.Features.Teams;
using Juggle.Api.Features.Workflow;
using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Tests;

// Tests share one seeded database. Each test books a different person, in weeks after the seeded allocations.
public sealed class AllocationsTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;
    private readonly DateOnly _today = new OrgClock(TimeProvider.System).Today;
    private readonly DateOnly _monday = new OrgClock(TimeProvider.System).Today.StartOfWeek().AddDays(7 * 12);

    [Fact]
    public async Task Traffic_manager_creates_an_allocation_that_shows_on_the_schedule()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var (person, job) = await StudioPersonAndJobAsync(client, "Priya Naidoo");

        var response = await client.PostAsJsonAsync("/api/allocations", Booking(person, job, 4), ApiFactory.Json, _ct);
        var saved = await response.Content.ReadFromJsonAsync<SavedAllocationDto>(ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Empty(saved!.ClashDays);
        var schedule = await GetStudioScheduleAsync(client);
        Assert.Contains(schedule.Allocations, a => a.Id == saved.Id && a.PersonId == person && a.HoursPerDay == 4);
    }

    [Fact]
    public async Task Booking_over_capacity_is_saved_and_lists_the_clash_days()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var (person, job) = await StudioPersonAndJobAsync(client, "Lerato Mokoena");
        await client.PostAsJsonAsync("/api/allocations", Booking(person, job, 6), ApiFactory.Json, _ct);

        var response = await client.PostAsJsonAsync("/api/allocations", Booking(person, job, 4), ApiFactory.Json, _ct);
        var saved = await response.Content.ReadFromJsonAsync<SavedAllocationDto>(ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotEmpty(saved!.ClashDays);
        Assert.All(saved.ClashDays, d => Assert.InRange(d, _monday, _monday.AddDays(4)));
    }

    [Fact]
    public async Task Update_moves_an_allocation_to_other_dates_and_another_person()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var (ethan, job) = await StudioPersonAndJobAsync(client, "Ethan Pillay");
        var (amahle, _) = await StudioPersonAndJobAsync(client, "Amahle Dlamini");
        var created = await CreateAsync(client, Booking(ethan, job, 3));

        var moved = Booking(amahle, job, 5) with { StartDate = _monday.AddDays(1), EndDate = _monday.AddDays(2), Notes = "  Moved  " };
        var response = await client.PutAsJsonAsync($"/api/allocations/{created.Id}", moved, ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bar = (await GetStudioScheduleAsync(client)).Allocations.Single(a => a.Id == created.Id);
        Assert.Equal((amahle, _monday.AddDays(1), _monday.AddDays(2), 5m, "Moved"), (bar.PersonId, bar.StartDate, bar.EndDate, bar.HoursPerDay, bar.Notes));
    }

    [Fact]
    public async Task Delete_removes_the_allocation()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var (person, job) = await StudioPersonAndJobAsync(client, "Ruben Fourie");
        var created = await CreateAsync(client, Booking(person, job, 2));

        var response = await client.DeleteAsync($"/api/allocations/{created.Id}", _ct);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.DoesNotContain((await GetStudioScheduleAsync(client)).Allocations, a => a.Id == created.Id);
    }

    [Fact]
    public async Task Only_users_who_book_work_create_or_change_bookings()
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var (person, job) = await StudioPersonAndJobAsync(chloe, "Ethan Pillay");
        var created = await CreateAsync(chloe, Booking(person, job, 2));
        var priya = await api.SignInAsAsync("Priya Naidoo");
        var naledi = await api.SignInAsAsync("Naledi Khumalo");

        var designerCreate = await priya.PostAsJsonAsync("/api/allocations", Booking(person, job, 2), ApiFactory.Json, _ct);
        var headDelete = await naledi.DeleteAsync($"/api/allocations/{created.Id}", _ct);

        Assert.Equal(HttpStatusCode.Forbidden, designerCreate.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, headDelete.StatusCode);
    }

    [Fact]
    public async Task Invalid_bookings_return_400()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var (person, job) = await StudioPersonAndJobAsync(client, "Sipho Ndlovu");

        var endBeforeStart = Booking(person, job, 4) with { EndDate = _monday.AddDays(-1) };
        var noHours = Booking(person, job, 0);
        var notInTeam = Booking(Guid.CreateVersion7(), job, 4);

        foreach (var request in new[] { endBeforeStart, noHours, notInTeam })
        {
            var response = await client.PostAsJsonAsync("/api/allocations", request, ApiFactory.Json, _ct);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }

    [Fact]
    public async Task Errors_shown_to_users_say_booking()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var (person, job) = await StudioPersonAndJobAsync(client, "Sipho Ndlovu");

        var tooLong = await client.PostAsJsonAsync(
            "/api/allocations", Booking(person, job, 4) with { EndDate = _monday.AddYears(2) }, ApiFactory.Json, _ct);
        var missing = await client.DeleteAsync($"/api/allocations/{Guid.CreateVersion7()}", _ct);

        Assert.Equal("A booking can be at most a year long.", (await tooLong.Content.ReadFromJsonAsync<ProblemDetails>(_ct))!.Detail);
        Assert.Equal("Booking not found.", (await missing.Content.ReadFromJsonAsync<ProblemDetails>(_ct))!.Detail);
    }

    [Fact]
    public async Task A_schedule_booking_is_refused_for_a_job_allocated_to_someone_else()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var (_, job) = await StudioPersonAndJobAsync(client, "Ethan Pillay");
        var amahle = await StudioPersonAsync(client, "Amahle Dlamini");

        var response = await client.PostAsJsonAsync("/api/allocations", Booking(amahle, job, 2), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("This job is allocated to someone else.", (await response.Content.ReadFromJsonAsync<ProblemDetails>(_ct))!.Detail);
    }

    [Fact]
    public async Task A_schedule_booking_is_refused_for_an_unallocated_job_which_goes_through_allocate_and_schedule()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var ruben = await StudioPersonAsync(client, "Ruben Fourie");
        var job = await NewJobAsync();

        var response = await client.PostAsJsonAsync("/api/allocations", Booking(ruben, job.Id, 2), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task A_schedule_booking_is_refused_once_the_job_is_cancelled()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var (person, job) = await StudioPersonAndJobAsync(client, "Ruben Fourie");
        await client.PostAsJsonAsync($"/api/jobs/{job}/cancel", new MessageRequest("Not needed"), ApiFactory.Json, _ct);

        var response = await client.PostAsJsonAsync("/api/allocations", Booking(person, job, 2), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Check_lists_clash_days_and_how_late_the_booking_finishes()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var week = _monday.AddDays(7 * 50);
        var (person, job) = await StudioPersonAndJobAsync(client, "Priya Naidoo", required: week.AddDays(4));
        await CreateAsync(client, Booking(person, job, 6) with { StartDate = week, EndDate = week.AddDays(4) });

        var check = await CheckAsync(client, person, job, week, week.AddDays(11), 4);

        Assert.Equal(Enumerable.Range(0, 5).Select(week.AddDays), check.ClashDays);
        Assert.Equal((week.AddDays(4), 5, 5), (check.Deadline, check.WorkingDaysLate, check.WorkingDaysToDeadline));
    }

    [Fact]
    public async Task Check_leaves_out_the_booking_being_moved_and_finds_no_lateness_when_it_fits()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var week = _monday.AddDays(7 * 55);
        var (person, job) = await StudioPersonAndJobAsync(client, "Sipho Ndlovu", required: week.AddDays(4));
        var created = await CreateAsync(client, Booking(person, job, 6) with { StartDate = week, EndDate = week.AddDays(4) });

        var check = await CheckAsync(client, person, job, week, week.AddDays(4), 6, created.Id);

        Assert.Empty(check.ClashDays);
        Assert.Equal(0, check.WorkingDaysLate);
    }

    [Fact]
    public async Task Availability_gives_each_person_their_free_hours_over_the_days()
    {
        var client = await api.SignInAsAsync("Chloe Adams");
        var (person, job) = await StudioPersonAndJobAsync(client, "Ruben Fourie");
        var week = _monday.AddDays(7 * 70);
        await CreateAsync(client, Booking(person, job, 3) with { StartDate = week, EndDate = week.AddDays(4) });
        var studio = await GetTeamIdAsync(client, "Design Studio");
        var people = await client.GetFromJsonAsync<List<PersonDto>>($"/api/teams/{studio}/people", ApiFactory.Json, _ct);

        var free = await client.GetFromJsonAsync<List<PersonAvailabilityDto>>(
            $"/api/allocations/availability?teamId={studio}&startDate={week:yyyy-MM-dd}&endDate={week.AddDays(4):yyyy-MM-dd}", ApiFactory.Json, _ct);

        var hours = people!.Single(p => p.Id == person).HoursPerDay;
        Assert.Equal(5 * (hours - 3), free!.Single(f => f.PersonId == person).FreeHours);
        Assert.Equal(people!.Count, free!.Count);
    }

    [Fact]
    public async Task Check_and_availability_are_for_users_who_book_work()
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var (person, job) = await StudioPersonAndJobAsync(chloe, "Ethan Pillay");
        var priya = await api.SignInAsAsync("Priya Naidoo");
        var studio = await GetTeamIdAsync(chloe, "Design Studio");

        var check = await priya.GetAsync($"/api/allocations/check?jobId={job}&personId={person}&startDate={_monday:yyyy-MM-dd}&endDate={_monday:yyyy-MM-dd}&hoursPerDay=2", _ct);
        var availability = await priya.GetAsync(
            $"/api/allocations/availability?teamId={studio}&startDate={_monday:yyyy-MM-dd}&endDate={_monday:yyyy-MM-dd}", _ct);

        Assert.Equal(HttpStatusCode.Forbidden, check.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, availability.StatusCode);
    }

    private async Task<AllocationCheckDto> CheckAsync(
        HttpClient client, Guid person, Guid job, DateOnly start, DateOnly end, decimal hoursPerDay, Guid? except = null) =>
        (await client.GetFromJsonAsync<AllocationCheckDto>(
            $"/api/allocations/check?jobId={job}&personId={person}&startDate={start:yyyy-MM-dd}&endDate={end:yyyy-MM-dd}&hoursPerDay={hoursPerDay}"
                + (except is null ? "" : $"&exceptAllocationId={except}"),
            ApiFactory.Json, _ct))!;

    private SaveAllocationRequest Booking(Guid personId, Guid jobId, decimal hoursPerDay) =>
        new(personId, jobId, _monday, _monday.AddDays(4), hoursPerDay, null);

    private async Task<SavedAllocationDto> CreateAsync(HttpClient client, SaveAllocationRequest request)
    {
        var response = await client.PostAsJsonAsync("/api/allocations", request, ApiFactory.Json, _ct);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<SavedAllocationDto>(ApiFactory.Json, _ct))!;
    }

    /// <summary>The person, and a new job of their own to book: allocated to them in a week the tests do not use.</summary>
    private async Task<(Guid Person, Guid Job)> StudioPersonAndJobAsync(HttpClient client, string name, DateOnly? required = null)
    {
        var person = await StudioPersonAsync(client, name);
        var job = await NewJobAsync(required);
        var far = _monday.AddDays(7 * 30);
        var allocated = await client.PostAsJsonAsync($"/api/jobs/{job.Id}/allocate", new AllocateRequest(person, far, far, 1, 1), ApiFactory.Json, _ct);
        allocated.EnsureSuccessStatusCode();
        return (person, job.Id);
    }

    private async Task<Guid> StudioPersonAsync(HttpClient client, string name)
    {
        var studioId = await GetTeamIdAsync(client, "Design Studio");
        var people = await client.GetFromJsonAsync<List<PersonDto>>($"/api/teams/{studioId}/people", ApiFactory.Json, _ct);
        return people!.Single(p => p.Name == name).Id;
    }

    private async Task<JobDto> NewJobAsync(DateOnly? required = null)
    {
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var options = await zanele.GetFromJsonAsync<JobOptionsDto>("/api/jobs/options", ApiFactory.Json, _ct);
        var studio = options!.Teams.Single(t => t.Name == "Design Studio").Id;
        var brief = Briefs.Minimal(studio, options.MyDepartmentId!.Value, "Booking test", required ?? _today.AddDays(14));
        var response = await zanele.PostAsJsonAsync("/api/jobs", brief, ApiFactory.Json, _ct);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, _ct))!.Job;
    }

    private async Task<CapacityDto> GetStudioScheduleAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<CapacityDto>(
            $"/api/capacity?teamId={await GetTeamIdAsync(client, "Design Studio")}&start={_monday:yyyy-MM-dd}&weeks=1", ApiFactory.Json, _ct))!;

    private async Task<Guid> GetTeamIdAsync(HttpClient client, string name)
    {
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);
        return teams!.Single(t => t.Name == name).Id;
    }
}
