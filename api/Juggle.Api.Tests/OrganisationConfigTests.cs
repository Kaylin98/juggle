using System.Net.Http.Json;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Jobs;
using Juggle.Api.Features.Teams;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Juggle.Api.Tests;

/// <summary>
/// Juggle is configured per organisation (D77): code reads the org's workflow and formats, never a status's name.
/// These change configuration that other tests read, so they run on their own.
/// </summary>
[Collection(typeof(RunsAlone))]
public sealed class OrganisationConfigTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;

    [Fact]
    public async Task Renaming_the_first_status_keeps_the_workflow()
    {
        await RenameStatusAsync("New Request", "Fresh Brief");
        try
        {
            var bongani = await api.SignInAsAsync("Bongani Zulu");
            var options = (await bongani.GetFromJsonAsync<JobOptionsDto>("/api/jobs/options", ApiFactory.Json, _ct))!;
            var today = new OrgClock(TimeProvider.System).Today;
            var brief = new CreateJobRequest(options.Teams[0].Id, "Renamed status brief", null, null, options.MyDepartmentId!.Value, today.AddDays(14), Priority.Low);
            var response = await bongani.PostAsJsonAsync("/api/jobs", brief, ApiFactory.Json, _ct);
            var submitted = (await response.Content.ReadFromJsonAsync<JobDto>(ApiFactory.Json, _ct))!;

            var chloe = await api.SignInAsAsync("Chloe Adams");
            var teamId = (await chloe.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct))!.Single().Id;
            var incoming = await chloe.GetFromJsonAsync<List<JobDto>>($"/api/teams/{teamId}/incoming", ApiFactory.Json, _ct);

            Assert.Equal("Fresh Brief", submitted.StatusName);
            Assert.Contains(incoming!, j => j.Id == submitted.Id);
        }
        finally
        {
            await RenameStatusAsync("Fresh Brief", "New Request");
        }
    }

    /// <summary>A new job ID follows the org's format; the IDs already given never change (D71).</summary>
    [Fact]
    public async Task A_new_format_applies_to_new_jobs_only()
    {
        var chloe = await api.SignInAsAsync("Chloe Adams");
        var teamId = (await chloe.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct))!.Single().Id;
        var before = (await chloe.GetFromJsonAsync<List<JobDto>>($"/api/teams/{teamId}/jobs", ApiFactory.Json, _ct))!;
        var original = await SetJobCodeFormatAsync("{prefix}-{number}");
        try
        {
            // Fatima's first brand is CCB, which has no seeded jobs and no other test sends briefs for.
            var fatima = await api.SignInAsAsync("Fatima Patel");
            var options = (await fatima.GetFromJsonAsync<JobOptionsDto>("/api/jobs/options", ApiFactory.Json, _ct))!;
            var today = new OrgClock(TimeProvider.System).Today;
            var brief = new CreateJobRequest(teamId, "Coffee menu", null, null, options.MyDepartmentId!.Value, today.AddDays(14), Priority.Low);
            var submitted = (await (await fatima.PostAsJsonAsync("/api/jobs", brief, ApiFactory.Json, _ct)).Content.ReadFromJsonAsync<JobDto>(ApiFactory.Json, _ct))!;
            var after = (await chloe.GetFromJsonAsync<List<JobDto>>($"/api/teams/{teamId}/jobs", ApiFactory.Json, _ct))!;

            Assert.Equal("CCB-1", submitted.Code);
            Assert.All(before, job => Assert.Equal(job.Code, after.Single(j => j.Id == job.Id).Code));
        }
        finally
        {
            await SetJobCodeFormatAsync(original);
        }
    }

    /// <summary>Sets the org's job ID format and returns the one it replaced.</summary>
    private async Task<string> SetJobCodeFormatAsync(string format)
    {
        await using var scope = api.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<JuggleDbContext>();
        var organisation = await db.Organisations.IgnoreQueryFilters().SingleAsync(_ct);
        var original = organisation.JobCodeFormat;
        organisation.JobCodeFormat = format;
        await db.SaveChangesAsync(_ct);
        return original;
    }

    private async Task RenameStatusAsync(string from, string to)
    {
        await using var scope = api.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<JuggleDbContext>();
        var status = await db.JobStatuses.IgnoreQueryFilters().SingleAsync(s => s.Name == from, _ct);
        status.Name = to;
        await db.SaveChangesAsync(_ct);
    }
}
