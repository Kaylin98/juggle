using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Features.Allocations;
using Juggle.Api.Features.Capacity;
using Juggle.Api.Features.Jobs;
using Juggle.Api.Features.Teams;
using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Tests;

// Tests share one seeded database. Each test books a different person, in weeks after the seeded allocations.
public sealed class AllocationsTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;
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

    private SaveAllocationRequest Booking(Guid personId, Guid jobId, decimal hoursPerDay) =>
        new(personId, jobId, _monday, _monday.AddDays(4), hoursPerDay, null);

    private async Task<SavedAllocationDto> CreateAsync(HttpClient client, SaveAllocationRequest request)
    {
        var response = await client.PostAsJsonAsync("/api/allocations", request, ApiFactory.Json, _ct);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<SavedAllocationDto>(ApiFactory.Json, _ct))!;
    }

    private async Task<(Guid Person, Guid Job)> StudioPersonAndJobAsync(HttpClient client, string name)
    {
        var studioId = await GetTeamIdAsync(client, "Design Studio");
        var people = await client.GetFromJsonAsync<List<PersonDto>>($"/api/teams/{studioId}/people", ApiFactory.Json, _ct);
        var jobs = await client.GetFromJsonAsync<List<JobDto>>($"/api/teams/{studioId}/jobs", ApiFactory.Json, _ct);
        return (people!.Single(p => p.Name == name).Id, jobs!.First().Id);
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
