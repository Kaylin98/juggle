using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Allocations;
using Juggle.Api.Features.Jobs;
using Juggle.Api.Features.Teams;

namespace Juggle.Api.Tests;

/// <summary>
/// The role audit (D70, D77): every endpoint a role's capabilities do not allow is refused by the server, whatever
/// the UI shows. Nothing here is allowed to succeed, so these tests change no data.
/// </summary>
public sealed class AccessTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;
    private readonly DateOnly _monday = new OrgClock(TimeProvider.System).Today.StartOfWeek().AddDays(7 * 20);

    [Fact]
    public async Task Signed_out_users_get_401()
    {
        var client = api.CreateClient();

        await AssertGetStatusAsync(client, HttpStatusCode.Unauthorized,
            "/api/auth/me", "/api/teams", "/api/jobs/mine", "/api/workflow", "/api/dashboard?teamId=all");
    }

    [Fact]
    public async Task Marketing_manager_sees_no_board_schedule_or_workloads_and_cannot_book()
    {
        var data = await StudioDataAsync();
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var team = $"/api/teams/{data.TeamId}";

        // CD5: only their own jobs; no board, schedule, workloads or other managers' jobs.
        await AssertGetStatusAsync(zanele, HttpStatusCode.Forbidden,
            $"{team}/jobs", $"{team}/people", $"{team}/incoming",
            $"/api/capacity?teamId={data.TeamId}&start={_monday:yyyy-MM-dd}", $"/api/dashboard?teamId={data.TeamId}",
            $"/api/jobs/{data.SomeoneElsesJob}", $"{team}/reports/briefs", "/api/my-work");
        await AssertGetStatusAsync(zanele, HttpStatusCode.OK, "/api/jobs/mine", "/api/jobs/options");

        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(zanele, "/api/allocations", Booking(data)));
    }

    [Fact]
    public async Task Designer_sees_the_board_but_not_the_schedule_and_cannot_triage_brief_or_book()
    {
        var data = await StudioDataAsync();
        var ethan = await api.SignInAsAsync("Ethan Pillay");
        var team = $"/api/teams/{data.TeamId}";

        await AssertGetStatusAsync(ethan, HttpStatusCode.OK, $"{team}/jobs", "/api/my-work");
        await AssertGetStatusAsync(ethan, HttpStatusCode.Forbidden,
            $"/api/capacity?teamId={data.TeamId}&start={_monday:yyyy-MM-dd}", $"/api/capacity?teamId=all&start={_monday:yyyy-MM-dd}",
            $"{team}/incoming", $"/api/jobs/{data.SomeoneElsesJob}", $"/api/dashboard?teamId={data.TeamId}",
            "/api/dashboard?teamId=all", $"{team}/reports/briefs", "/api/time-off/approvals");

        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(ethan, "/api/jobs", Brief(data)));
        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(ethan, "/api/allocations", Booking(data)));
    }

    [Theory]
    [InlineData("Naledi Khumalo")]
    [InlineData("Megan Botha")]
    public async Task Heads_see_all_the_work_but_cannot_triage_brief_or_book(string head)
    {
        var data = await StudioDataAsync();
        var client = await api.SignInAsAsync(head);
        var team = $"/api/teams/{data.TeamId}";

        await AssertGetStatusAsync(client, HttpStatusCode.OK,
            $"{team}/jobs", $"/api/jobs/{data.SomeoneElsesJob}", $"/api/capacity?teamId={data.TeamId}&start={_monday:yyyy-MM-dd}",
            $"/api/dashboard?teamId={data.TeamId}", $"{team}/reports/briefs");
        await AssertGetStatusAsync(client, HttpStatusCode.Forbidden, $"{team}/incoming", "/api/time-off/approvals");

        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(client, "/api/jobs", Brief(data)));
        Assert.Equal(HttpStatusCode.Forbidden, await PostAsync(client, "/api/allocations", Booking(data)));
    }

    /// <param name="SomeoneElsesJob">Not briefed by Zanele, and not Ethan's.</param>
    private sealed record StudioData(Guid TeamId, Guid JobId, Guid DepartmentId, Guid PersonId, Guid SomeoneElsesJob);

    /// <summary>Ids from the studio, read as the Traffic Manager.</summary>
    private async Task<StudioData> StudioDataAsync()
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var teamId = (await chloe.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct))!.Single().Id;
        var people = (await chloe.GetFromJsonAsync<List<PersonDto>>($"/api/teams/{teamId}/people", ApiFactory.Json, _ct))!;
        var jobs = (await chloe.GetFromJsonAsync<List<JobDto>>($"/api/teams/{teamId}/jobs", ApiFactory.Json, _ct))!;

        var priya = people.Single(p => p.Name == "Priya Naidoo").Id;
        return new StudioData(
            teamId,
            jobs[0].Id,
            jobs[0].DepartmentId,
            priya,
            jobs.First(j => j.RequesterName != "Zanele Mthembu" && j.DesignerName is not (null or "Ethan Pillay")).Id);
    }

    private SaveAllocationRequest Booking(StudioData data) => new(data.PersonId, data.JobId, _monday, _monday.AddDays(1), 2, null);

    private static CreateJobRequest Brief(StudioData data) =>
        new(data.TeamId, "Not allowed", null, null, data.DepartmentId, null, Priority.Medium);

    /// <summary>GETs each url and checks the status.</summary>
    private async Task AssertGetStatusAsync(HttpClient client, HttpStatusCode expected, params string[] urls)
    {
        foreach (var url in urls)
        {
            var response = await client.GetAsync(url, _ct);
            Assert.True(response.StatusCode == expected, $"{url}: expected {(int)expected}, got {(int)response.StatusCode}");
        }
    }

    private async Task<HttpStatusCode> PostAsync<T>(HttpClient client, string url, T body) =>
        (await client.PostAsJsonAsync(url, body, ApiFactory.Json, _ct)).StatusCode;
}
