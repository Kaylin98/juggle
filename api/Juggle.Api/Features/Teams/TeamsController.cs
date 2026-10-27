using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Teams;

[ApiController]
[Route("api/teams")]
public sealed class TeamsController(TeamsService teams) : ControllerBase
{
    [HttpGet]
    public Task<IReadOnlyList<TeamDto>> GetMyTeams(CancellationToken ct) => teams.GetMyTeamsAsync(ct);

    [HttpGet("{teamId:guid}/statuses")]
    public Task<IReadOnlyList<StatusDto>> GetStatuses(Guid teamId, CancellationToken ct) => teams.GetStatusesAsync(teamId, ct);

    [HttpGet("{teamId:guid}/projects")]
    public Task<IReadOnlyList<ProjectDto>> GetProjects(Guid teamId, CancellationToken ct) => teams.GetProjectsAsync(teamId, ct);

    [HttpGet("{teamId:guid}/people")]
    public Task<IReadOnlyList<PersonDto>> GetPeople(Guid teamId, CancellationToken ct) => teams.GetPeopleAsync(teamId, ct);
}
