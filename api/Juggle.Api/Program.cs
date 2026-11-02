using System.Text.Json.Serialization;
using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Seed;
using Juggle.Api.Features.Allocations;
using Juggle.Api.Features.Auth;
using Azure.Storage.Blobs;
using Juggle.Api.Features.Capacity;
using Juggle.Api.Features.Dashboard;
using Juggle.Api.Features.Files;
using Juggle.Api.Features.Jobs;
using Juggle.Api.Features.MyWork;
using Juggle.Api.Features.Reports;
using Juggle.Api.Features.Teams;
using Juggle.Api.Features.TimeOffRequests;
using Juggle.Api.Features.Workflow;
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
builder.Services.AddScoped<JobAccess>();
builder.Services.AddScoped<JobWorkflow>();
builder.Services.AddScoped<JobActionAccess>();
builder.Services.AddScoped<IDemoAuth, CookieDemoAuth>();
builder.Services.AddScoped<DemoSeeder>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<TeamsService>();
builder.Services.AddScoped<CapacityService>();
builder.Services.AddScoped<AllocationChecks>();
builder.Services.AddScoped<AllocationService>();
builder.Services.AddScoped<JobsService>();
builder.Services.AddScoped<JobFilesService>();

// Uploaded files go to Azure Blob Storage when a connection string is configured, otherwise to a local folder.
var files = builder.Configuration.GetSection("Files").Get<FileStoreOptions>() ?? new FileStoreOptions();
if (string.IsNullOrWhiteSpace(files.ConnectionString))
{
    builder.Services.AddSingleton<IFileStore>(new LocalFileStore(Path.Combine(builder.Environment.ContentRootPath, files.LocalPath)));
}
else
{
    builder.Services.AddSingleton<IFileStore>(new AzureBlobFileStore(new BlobContainerClient(files.ConnectionString, files.Container)));
}
builder.Services.AddScoped<JobActions>();
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
