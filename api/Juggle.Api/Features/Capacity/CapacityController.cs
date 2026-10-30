using Juggle.Api.Common;
using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Capacity;

[ApiController]
[Route("api/capacity")]
public sealed class CapacityController(CapacityService capacity) : ControllerBase
{
    [HttpGet]
    public Task<CapacityDto> Get([FromQuery] CapacityQuery query, CancellationToken ct) =>
        capacity.GetAsync(TeamScope.Parse(query.TeamId), query.Start!.Value, query.Weeks, ct);
}
