using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Jobs;
using Juggle.Api.Features.Teams;
using Juggle.Api.Features.Workflow;

namespace Juggle.Api.Tests;

/// <summary>Briefs for tests that need one but not its sections.</summary>
internal static class Briefs
{
    public static readonly BriefObjectives NoObjectives = new(null, null, null, null, null, null);

    public static readonly CreativeGuidelines NoGuidelines = new(null, null, null, null, null, null, null, null, null);

    /// <summary>Only what a brief needs: the team, the brand and a title.</summary>
    public static CreateJobRequest Minimal(Guid teamId, Guid departmentId, string title, DateOnly? requiredDate = null) =>
        new(teamId, departmentId, title, null, null, null, requiredDate, Priority.Medium, NoObjectives, [], NoGuidelines, [], null);

    /// <summary>
    /// Sends a brief to the Design Studio as the marketing manager, then allocates it to the designer for one hour on the
    /// start date, which is far from the weeks the tests book. Gives a job that can be booked from the schedule.
    /// </summary>
    public static async Task<(Guid Person, JobDto Job)> AllocatedJobAsync(
        ApiFactory api, string designer, DateOnly start, CancellationToken ct, DateOnly? required = null)
    {
        var zanele = await api.SignInAsAsync("Zanele Mthembu");
        var options = await zanele.GetFromJsonAsync<JobOptionsDto>("/api/jobs/options", ApiFactory.Json, ct);
        var studio = options!.Teams.Single(t => t.Name == "Design Studio").Id;
        var today = new OrgClock(TimeProvider.System).Today;
        var response = await zanele.PostAsJsonAsync(
            "/api/jobs", Minimal(studio, options.MyDepartmentId!.Value, "Booking test", required ?? today.AddDays(14)), ApiFactory.Json, ct);
        response.EnsureSuccessStatusCode();
        var job = (await response.Content.ReadFromJsonAsync<JobDetailDto>(ApiFactory.Json, ct))!.Job;

        var chloe = await api.SignInAsAsync("Chloe Adams");
        var people = await chloe.GetFromJsonAsync<List<PersonDto>>($"/api/teams/{studio}/people", ApiFactory.Json, ct);
        var person = people!.Single(p => p.Name == designer).Id;
        var allocated = await chloe.PostAsJsonAsync(
            $"/api/jobs/{job.Id}/allocate", new AllocateRequest(person, start, start, 1, 1), ApiFactory.Json, ct);
        allocated.EnsureSuccessStatusCode();
        return (person, job);
    }
}
