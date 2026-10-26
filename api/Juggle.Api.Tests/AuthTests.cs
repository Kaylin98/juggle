using System.Net;
using System.Net.Http.Json;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Auth;
using Juggle.Api.Features.Teams;

namespace Juggle.Api.Tests;

public sealed class AuthTests(ApiFactory api)
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;

    [Fact]
    public async Task Demo_users_list_every_seeded_user_with_a_role()
    {
        var users = await api.CreateClient().GetFromJsonAsync<List<DemoUserDto>>("/api/auth/demo-users", ApiFactory.Json, _ct);

        Assert.Equal(14, users!.Count);
        Assert.Equal("Org Admin", users[0].Role);
        Assert.Equal(3, users.Count(u => u.Role == "Requester"));
    }

    [Fact]
    public async Task Signed_in_org_admin_sees_every_team_as_admin()
    {
        var client = await api.SignInAsAsync("Naledi Khumalo");

        var me = await client.GetFromJsonAsync<MeDto>("/api/auth/me", ApiFactory.Json, _ct);
        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);

        Assert.Equal(OrgRole.OrgAdmin, me!.OrgRole);
        Assert.Equal(["Design", "Marketing"], teams!.Select(t => t.Name));
        Assert.All(teams!, t => Assert.Equal(TeamRole.TeamAdmin, t.MyRole));
    }

    [Fact]
    public async Task Member_sees_only_their_own_teams()
    {
        var client = await api.SignInAsAsync("Thabo Mahlangu");

        var teams = await client.GetFromJsonAsync<List<TeamDto>>("/api/teams", ApiFactory.Json, _ct);

        var team = Assert.Single(teams!);
        Assert.Equal("Marketing", team.Name);
        Assert.Equal(TeamRole.Member, team.MyRole);
    }

    [Fact]
    public async Task Me_without_signing_in_returns_401()
    {
        var response = await api.CreateClient().GetAsync("/api/auth/me", _ct);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
