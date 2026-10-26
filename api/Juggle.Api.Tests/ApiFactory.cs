using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Juggle.Api.Features.Auth;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.PostgreSql;

[assembly: AssemblyFixture(typeof(Juggle.Api.Tests.ApiFactory))]

namespace Juggle.Api.Tests;

/// <summary>Runs the API against a throwaway Postgres container, seeded with the demo data.</summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder("postgres:18").Build();

    public async ValueTask InitializeAsync() => await _db.StartAsync();

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        await _db.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("ConnectionStrings:Juggle", _db.GetConnectionString());
    }

    public async Task<HttpClient> SignInAsAsync(string name)
    {
        var ct = TestContext.Current.CancellationToken;
        var client = CreateClient();
        var users = await client.GetFromJsonAsync<List<DemoUserDto>>("/api/auth/demo-users", Json, ct);
        var user = users!.Single(u => u.Name == name);
        var response = await client.PostAsJsonAsync("/api/auth/sign-in", new SignInRequest(user.Id), Json, ct);
        response.EnsureSuccessStatusCode();
        return client;
    }
}
