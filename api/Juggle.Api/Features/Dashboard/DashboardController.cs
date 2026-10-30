using Juggle.Api.Common;
using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Dashboard;

[ApiController]
[Route("api/dashboard")]
public sealed class DashboardController(DashboardService dashboard) : ControllerBase
{
    [HttpGet]
    public Task<DashboardDto> Get([FromQuery] DashboardQuery query, CancellationToken ct) =>
        dashboard.GetAsync(TeamScope.Parse(query.TeamId), ct);
}
