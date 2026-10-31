using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Allocations;
using Juggle.Api.Features.Auth;
using Juggle.Api.Features.Capacity;
using Juggle.Api.Features.MyWork;
using Juggle.Api.Features.Teams;
using Juggle.Api.Features.TimeOffRequests;

namespace Juggle.Api.Tests;

// Tests share one seeded database. Each test asks for leave for a different person, or in a different week,
// well after the seeded bookings and leave.
public sealed class TimeOffTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;
    private readonly DateOnly _thisMonday = new OrgClock(TimeProvider.System).Today.StartOfWeek();

    [Fact]
    public async Task Pending_leave_shows_on_the_schedule_without_reducing_capacity_until_approved()
    {
        var lerato = await api.SignInAsAsync("Lerato Mokoena");
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var monday = await WorkingMondayAsync(20);
        var (thursday, friday) = (monday.AddDays(3), monday.AddDays(4));

        var response = await lerato.PostAsJsonAsync("/api/time-off", Leave(TimeOffType.AnnualLeave, thursday, friday, "  School holiday  "), ApiFactory.Json, _ct);
        var created = (await response.Content.ReadFromJsonAsync<MyTimeOffDto>(ApiFactory.Json, _ct))!;

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal((TimeOffStatus.Pending, 2, "School holiday"), (created.Status, created.WorkingDays, created.Note));
        var pending = await LeratoDaysAsync(naledi, monday);
        Assert.Equal(("Annual leave", 8m, null), (pending[3].PendingTimeOff, pending[3].Capacity, pending[3].TimeOff));
        Assert.Contains(await ApprovalsAsync(naledi), a => a.Id == created.Id && a.PersonName == "Lerato Mokoena" && a.Note == "School holiday");
        Assert.Contains((await MyWorkAsync(lerato)).TimeOff, t => t.Id == created.Id && t.Status == TimeOffStatus.Pending);

        Assert.Equal(HttpStatusCode.NoContent, (await naledi.PostAsync($"/api/time-off/{created.Id}/approve", null, _ct)).StatusCode);

        var approved = await LeratoDaysAsync(naledi, monday);
        Assert.Equal(("Annual leave", 0m, null), (approved[3].TimeOff, approved[3].Capacity, approved[3].PendingTimeOff));
        Assert.Equal(8m, approved[2].Capacity);
        Assert.DoesNotContain(await ApprovalsAsync(naledi), a => a.Id == created.Id);
        Assert.Contains((await MyWorkAsync(lerato)).TimeOff, t => t.Id == created.Id && t.Status == TimeOffStatus.Approved);
    }

    [Fact]
    public async Task Only_admins_of_the_persons_teams_and_org_admins_decide()
    {
        var priya = await api.SignInAsAsync("Priya Naidoo");
        var jason = await api.SignInAsAsync("Jason van Wyk");
        var megan = await api.SignInAsAsync("Megan Botha");
        var monday = await WorkingMondayAsync(22);
        var priyas = await RequestAsync(priya, TimeOffType.StudyLeave, monday, monday);
        var jasons = await RequestAsync(jason, TimeOffType.FamilyResponsibility, monday, monday.AddDays(1));

        // Jason is a Member; Megan admins Marketing only, and Priya is in Design only.
        Assert.Equal(HttpStatusCode.Forbidden, (await jason.PostAsync($"/api/time-off/{priyas.Id}/approve", null, _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await megan.PostAsync($"/api/time-off/{priyas.Id}/approve", null, _ct)).StatusCode);
        Assert.DoesNotContain(await ApprovalsAsync(megan), a => a.Id == priyas.Id);
        Assert.Empty(await ApprovalsAsync(jason));

        // Jason is also in Marketing, so Megan decides his; the Org Admin decides anyone's.
        Assert.Contains(await ApprovalsAsync(megan), a => a.Id == jasons.Id && a.Teams.SequenceEqual(["Marketing", "Studio"]));
        Assert.Equal(HttpStatusCode.NoContent, (await megan.PostAsync($"/api/time-off/{jasons.Id}/approve", null, _ct)).StatusCode);
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        Assert.Equal(HttpStatusCode.NoContent, (await naledi.PostAsync($"/api/time-off/{priyas.Id}/approve", null, _ct)).StatusCode);

        Assert.Equal(HttpStatusCode.BadRequest, (await naledi.PostAsync($"/api/time-off/{priyas.Id}/approve", null, _ct)).StatusCode);
    }

    [Fact]
    public async Task Declining_needs_a_reason_which_the_requester_sees_and_the_schedule_hides_it()
    {
        var ruben = await api.SignInAsAsync("Ruben Fourie");
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var monday = await WorkingMondayAsync(24);
        var request = await RequestAsync(ruben, TimeOffType.Other, monday, monday.AddDays(1));

        var noReason = await naledi.PostAsJsonAsync($"/api/time-off/{request.Id}/decline", new { reason = "" }, ApiFactory.Json, _ct);
        var declined = await naledi.PostAsJsonAsync($"/api/time-off/{request.Id}/decline", new DeclineTimeOffRequest(" Launch week "), ApiFactory.Json, _ct);

        Assert.Equal(HttpStatusCode.BadRequest, noReason.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, declined.StatusCode);
        var mine = (await MyWorkAsync(ruben)).TimeOff.Single(t => t.Id == request.Id);
        Assert.Equal((TimeOffStatus.Declined, "Launch week", "Time off"), (mine.Status, mine.DeclineReason, mine.Label));
        var schedule = await ScheduleAsync(naledi, "Studio", monday);
        var day = schedule.People.Single(p => p.Name == "Ruben Fourie").Days[0];
        Assert.Equal((null, null, 5m), (day.TimeOff, day.PendingTimeOff, day.Capacity));
    }

    [Fact]
    public async Task Only_the_requester_cancels_and_only_while_pending()
    {
        var sipho = await api.SignInAsAsync("Sipho Ndlovu");
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var monday = await WorkingMondayAsync(26);
        var cancelled = await RequestAsync(sipho, TimeOffType.AnnualLeave, monday, monday);
        var approved = await RequestAsync(sipho, TimeOffType.AnnualLeave, monday.AddDays(1), monday.AddDays(1));
        await naledi.PostAsync($"/api/time-off/{approved.Id}/approve", null, _ct);

        Assert.Equal(HttpStatusCode.Forbidden, (await naledi.PostAsync($"/api/time-off/{cancelled.Id}/cancel", null, _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await sipho.PostAsync($"/api/time-off/{cancelled.Id}/cancel", null, _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await sipho.PostAsync($"/api/time-off/{approved.Id}/cancel", null, _ct)).StatusCode);

        Assert.DoesNotContain((await MyWorkAsync(sipho)).TimeOff, t => t.Id == cancelled.Id);
        Assert.DoesNotContain(await ApprovalsAsync(naledi), a => a.Id == cancelled.Id);
        // The day is free again, so the same day can be asked for anew.
        Assert.Equal(HttpStatusCode.Created, (await PostLeaveAsync(sipho, TimeOffType.AnnualLeave, monday, monday)).StatusCode);
    }

    [Fact]
    public async Task Requests_are_checked()
    {
        var ethan = await api.SignInAsAsync("Ethan Pillay");
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var monday = await WorkingMondayAsync(28);
        await RequestAsync(ethan, TimeOffType.AnnualLeave, monday, monday.AddDays(1));

        Assert.Equal(HttpStatusCode.Forbidden, (await PostLeaveAsync(zanele, TimeOffType.AnnualLeave, monday, monday)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await PostLeaveAsync(ethan, TimeOffType.AnnualLeave, monday.AddDays(3), monday.AddDays(2))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await PostLeaveAsync(ethan, TimeOffType.AnnualLeave, monday.AddDays(5), monday.AddDays(6))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await PostLeaveAsync(ethan, TimeOffType.PublicHoliday, monday.AddDays(3), monday.AddDays(3))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await PostLeaveAsync(ethan, TimeOffType.SickLeave, monday.AddDays(1), monday.AddDays(2))).StatusCode);
    }

    [Fact]
    public async Task Sick_leave_reads_unavailable_except_to_the_person_and_their_admins()
    {
        // The seed gives Thabo (Marketing) sick leave on Monday and Tuesday this week.
        string Label(CapacityDto schedule) => schedule.People.Single(p => p.Name == "Thabo Mahlangu").Days[0].TimeOff!;

        Assert.Equal("Sick leave", Label(await ScheduleAsync(await api.SignInAsAsync("Thabo Mahlangu"), "Marketing", _thisMonday)));
        Assert.Equal("Sick leave", Label(await ScheduleAsync(await api.SignInAsAsync("Megan Botha"), "Marketing", _thisMonday)));
        Assert.Equal("Sick leave", Label(await ScheduleAsync(await api.SignInAsAsync("Naledi Khumalo"), "all", _thisMonday)));
        Assert.Equal("Unavailable", Label(await ScheduleAsync(await api.SignInAsAsync("Chloe Adams"), "Marketing", _thisMonday)));
        Assert.Equal("Unavailable", Label(await ScheduleAsync(await api.SignInAsAsync("Jason van Wyk"), "Marketing", _thisMonday)));
    }

    [Fact]
    public async Task Booking_over_approved_leave_lists_the_leave_days()
    {
        var ruben = await api.SignInAsAsync("Ruben Fourie");
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        var monday = await WorkingMondayAsync(32);
        var leave = await RequestAsync(ruben, TimeOffType.AnnualLeave, monday, monday.AddDays(1));
        await naledi.PostAsync($"/api/time-off/{leave.Id}/approve", null, _ct);
        var studioId = await TeamIdAsync(naledi, "Studio");
        var project = (await naledi.GetFromJsonAsync<List<ProjectDto>>($"/api/teams/{studioId}/projects", ApiFactory.Json, _ct))![0];
        var rubenId = (await ruben.GetFromJsonAsync<MeDto>("/api/auth/me", ApiFactory.Json, _ct))!.PersonId!.Value;

        var response = await naledi.PostAsJsonAsync(
            "/api/allocations", new SaveAllocationRequest(rubenId, project.Id, null, monday, monday.AddDays(2), 4, null), ApiFactory.Json, _ct);
        var saved = (await response.Content.ReadFromJsonAsync<SavedAllocationDto>(ApiFactory.Json, _ct))!;

        Assert.Equal([monday, monday.AddDays(1)], saved.LeaveDays);
        Assert.Empty(saved.ClashDays);
    }

    private static RequestTimeOffRequest Leave(TimeOffType type, DateOnly start, DateOnly end, string? note = null) => new(type, start, end, note);

    private Task<HttpResponseMessage> PostLeaveAsync(HttpClient client, TimeOffType type, DateOnly start, DateOnly end) =>
        client.PostAsJsonAsync("/api/time-off", Leave(type, start, end), ApiFactory.Json, _ct);

    private async Task<MyTimeOffDto> RequestAsync(HttpClient client, TimeOffType type, DateOnly start, DateOnly end)
    {
        var response = await PostLeaveAsync(client, type, start, end);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<MyTimeOffDto>(ApiFactory.Json, _ct))!;
    }

    private async Task<List<TimeOffApprovalDto>> ApprovalsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<List<TimeOffApprovalDto>>("/api/time-off/approvals", ApiFactory.Json, _ct))!;

    private async Task<MyWorkDto> MyWorkAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<MyWorkDto>("/api/my-work", ApiFactory.Json, _ct))!;

    private async Task<IReadOnlyList<DayLoad>> LeratoDaysAsync(HttpClient client, DateOnly monday) =>
        (await ScheduleAsync(client, "Studio", monday)).People.Single(p => p.Name == "Lerato Mokoena").Days;

    /// <param name="team">A team name, or "all".</param>
    private async Task<CapacityDto> ScheduleAsync(HttpClient client, string team, DateOnly start)
    {
        var teamId = team == "all" ? team : (await TeamIdAsync(client, team)).ToString();
        return (await client.GetFromJsonAsync<CapacityDto>($"/api/capacity?teamId={teamId}&start={start:yyyy-MM-dd}&weeks=1", ApiFactory.Json, _ct))!;
    }

    /// <summary>
    /// The Monday of the first week, from this many weeks ahead, with no public holiday, so each weekday is a working
    /// day whatever week the tests run in.
    /// </summary>
    private async Task<DateOnly> WorkingMondayAsync(int weeksAhead)
    {
        var naledi = await api.SignInAsAsync("Naledi Khumalo");
        for (var monday = _thisMonday.AddDays(7 * weeksAhead); ; monday = monday.AddDays(7))
        {
            var schedule = await ScheduleAsync(naledi, "all", monday);
            if (!schedule.People[0].Days.Any(d => d.PublicHoliday))
            {
                return monday;
            }
        }
    }

    private async Task<Guid> TeamIdAsync(HttpClient client, string name)
    {
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);
        return teams!.Single(t => t.Name == name).Id;
    }
}
