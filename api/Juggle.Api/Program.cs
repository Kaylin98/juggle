using System.Text.Json.Serialization;
using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Seed;
using Juggle.Api.Features.Allocations;
using Juggle.Api.Features.Auth;
using Juggle.Api.Features.Capacity;
using Juggle.Api.Features.Dashboard;
using Juggle.Api.Features.MyWork;
using Juggle.Api.Features.Reports;
using Juggle.Api.Features.Requests;
using Juggle.Api.Features.Tasks;
using Juggle.Api.Features.Teams;
using Juggle.Api.Features.TimeOffRequests;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var branding = builder.Configuration.GetSection("Branding").Get<BrandingOptions>()!;

builder.Services.AddDbContext<JuggleDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Juggle")));

builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<OrgClock>();
builder.Services.AddScoped<CurrentUser>();
builder.Services.AddScoped<Permissions>();
builder.Services.AddScoped<TeamAccess>();
builder.Services.AddScoped<IDemoAuth, CookieDemoAuth>();
builder.Services.AddScoped<DemoSeeder>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<TeamsService>();
builder.Services.AddScoped<TasksService>();
builder.Services.AddScoped<CapacityService>();
builder.Services.AddScoped<AllocationService>();
builder.Services.AddScoped<RequestService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<BriefsReportService>();
builder.Services.AddScoped<MyWorkService>();
builder.Services.AddScoped<TimeOffService>();

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "juggle.auth";
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddOpenApi(options => options.AddDocumentTransformer((document, _, _) =>
{
    document.Info.Title = $"{branding.ProductName} API";
    return Task.CompletedTask;
}));

var app = builder.Build();

if (args.Contains("--reset-demo"))
{
    await DemoSeeder.MigrateAndSeedAsync(app.Services, reset: true);
    return;
}

if (app.Environment.IsDevelopment())
{
    await DemoSeeder.MigrateAndSeedAsync(app.Services, reset: false);
    app.MapOpenApi().AllowAnonymous();
}

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
