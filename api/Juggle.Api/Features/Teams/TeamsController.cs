using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Teams;

[ApiController]
[Route("api/teams")]
public sealed class TeamsController(TeamsService teams) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<TeamDto>> GetMyTeams(CancellationToken ct) => teams.GetMyTeamsAsync(ct);

    [HttpGet("{teamId:guid}/people")]
    public Task<IReadOnlyList<PersonDto>> GetPeople(Guid teamId, CancellationToken ct) => teams.GetPeopleAsync(teamId, ct);
}
