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
/// Code reads the organisation's workflow, never a status's name (D77). Renaming a status that other tests read, so
/// these run on their own.
/// </summary>
[Collection(typeof(RunsAlone))]
public sealed class WorkflowConfigTests(ApiFactory api)
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

    private async Task RenameStatusAsync(string from, string to)
    {
        await using var scope = api.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<JuggleDbContext>();
        var status = await db.JobStatuses.IgnoreQueryFilters().SingleAsync(s => s.Name == from, _ct);
        status.Name = to;
        await db.SaveChangesAsync(_ct);
    }
}
