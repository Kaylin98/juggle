using Juggle.Api.Common;
using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Capacity;

[ApiController]
[Route("api/capacity")]
public sealed class CapacityController(CapacityService capacity) : ControllerBase
{
    public const string AllTeams = "all";

    [HttpGet]
    public Task<CapacityDto> Get([FromQuery] CapacityQuery query, CancellationToken ct)
    {
        Guid? teamId = query.TeamId == AllTeams
            ? null
            : Guid.TryParse(query.TeamId, out var id) ? id : throw new BadRequestException("teamId must be a team id or \"all\".");
        return capacity.GetAsync(teamId, query.Start!.Value, query.Weeks, ct);
    }
}
