using Juggle.Api.Data.Entities;
using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Requests;

[ApiController]
public sealed class RequestsController(RequestService requests) : ControllerBase
{
    [HttpGet("api/requests/options")]
    public Task<RequestOptionsDto> GetOptions(CancellationToken ct) => requests.GetOptionsAsync(ct);

    [HttpPost("api/requests")]
    public async Task<ActionResult<RequestDto>> Create(CreateRequestRequest request, CancellationToken ct)
    {
        var created = await requests.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpGet("api/requests/mine")]
    public Task<IReadOnlyList<RequestDto>> GetMine(CancellationToken ct) => requests.GetMineAsync(ct);

    [HttpGet("api/requests/{id:guid}")]
    public Task<RequestDto> Get(Guid id, CancellationToken ct) => requests.GetAsync(id, ct);

    [HttpGet("api/teams/{teamId:guid}/requests")]
    public Task<IReadOnlyList<RequestDto>> GetTeamRequests(Guid teamId, [FromQuery] RequestStatus? status, CancellationToken ct) =>
        requests.GetTeamRequestsAsync(teamId, status, ct);

    [HttpPost("api/requests/{id:guid}/accept")]
    public Task<RequestDto> Accept(Guid id, AcceptRequestRequest accept, CancellationToken ct) => requests.AcceptAsync(id, accept, ct);

    [HttpPost("api/requests/{id:guid}/reject")]
    public Task<RequestDto> Reject(Guid id, RejectRequestRequest reject, CancellationToken ct) => requests.RejectAsync(id, reject, ct);
}
