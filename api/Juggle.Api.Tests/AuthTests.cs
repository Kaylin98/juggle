using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Auth;
using Juggle.Api.Features.Teams;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Juggle.Api.Tests;

public sealed class AuthTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;

    [Fact]
    public async Task Demo_users_list_every_seeded_user_in_their_roles_order()
    {
        var users = await api.CreateClient().GetFromJsonAsync<List<DemoUserDto>>("/api/auth/demo-users", ApiFactory.Json, _ct);

        Assert.Equal(18, users!.Count);
        Assert.Equal(
            ["Head of Marketing", "Head of Design", "Traffic Manager", "Designer", "Marketing Manager"],
            users.Select(u => u.Role).Distinct());
        Assert.Equal([1, 1, 1, 6, 9], users.GroupBy(u => u.Role).Select(g => g.Count()));
        // A marketing manager can manage several brands, and is in no team (D58, D70).
        var zanele = users.Single(u => u.Name == "Zanele Mthembu");
        Assert.Equal(("Marketing Manager", null), (zanele.Role, zanele.JobTitle));
        Assert.Equal(["DJI", "Pure Electric"], zanele.Departments);
        Assert.Empty(zanele.Teams);
        Assert.Equal(["Design Studio"], users.Single(u => u.Name == "Priya Naidoo").Teams);
    }

    [Fact]
    public async Task Me_has_the_role_its_capabilities_and_the_org_terms()
    {
        var client = await api.SignInAsAsync("Chloe Adams");

        var me = await client.GetFromJsonAsync<MeDto>("/api/auth/me", ApiFactory.Json, _ct);
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);

        Assert.Equal("Traffic Manager", me!.Role);
        Assert.Equal(
            [Capability.ViewAllJobs, Capability.ViewBoard, Capability.ViewSchedule, Capability.ViewReports, Capability.TriageBriefs, Capability.Allocate, Capability.ApproveTimeOff],
            me.Capabilities);
        Assert.Equal(new TermsDto("Brand", "Brief", "Job"), me.Terms);
        Assert.Null(me.PersonId);
        Assert.Equal(["Design Studio"], teams!.Select(t => t.Name));
    }

    [Fact]
    public async Task Designers_see_their_team_and_marketing_managers_none()
    {
        var priya = await api.SignInAsAsync("Priya Naidoo");
        var zanele = await api.SignInAsAsync("Zanele Mthembu");

        var priyasTeams = await priya.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);
        var zanelesTeams = await zanele.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);

        Assert.Equal(["Design Studio"], priyasTeams!.Select(t => t.Name));
        Assert.Empty(zanelesTeams!);
    }

    /// <summary>Access comes from the role's capabilities, never its name (D77): renaming the role changes nothing.</summary>
    [Fact]
    public async Task Renaming_a_role_keeps_what_it_may_do()
    {
        await RenameRoleAsync("Traffic Manager", "Studio Coordinator");
        try
        {
            var client = await api.SignInAsAsync("Chloe Adams");
            var teamId = (await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct))!.Single().Id;

            var me = await client.GetFromJsonAsync<MeDto>("/api/auth/me", ApiFactory.Json, _ct);
            var inbox = await client.GetAsync($"/api/teams/{teamId}/requests", _ct);

            Assert.Equal("Studio Coordinator", me!.Role);
            Assert.Equal(HttpStatusCode.OK, inbox.StatusCode);
        }
        finally
        {
            await RenameRoleAsync("Studio Coordinator", "Traffic Manager");
        }
    }

    [Fact]
    public async Task Me_without_signing_in_returns_401()
    {
        var response = await api.CreateClient().GetAsync("/api/auth/me", _ct);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private async Task RenameRoleAsync(string from, string to)
    {
        await using var scope = api.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<JuggleDbContext>();
        var role = await db.Roles.IgnoreQueryFilters().SingleAsync(r => r.Name == from, _ct);
        role.Name = to;
        await db.SaveChangesAsync(_ct);
    }
}
