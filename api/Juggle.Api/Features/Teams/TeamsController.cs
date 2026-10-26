using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Teams;

[ApiController]
[Route("api/teams")]
public sealed class TeamsController(TeamsService teams) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<TeamDto>> GetMyTeams(CancellationToken ct) => teams.GetMyTeamsAsync(ct);
}
