using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.TimeOffRequests;

[ApiController]
[Route("api/time-off")]
public sealed class TimeOffController(TimeOffService timeOff) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<MyTimeOffDto>> Create(RequestTimeOffRequest request, CancellationToken ct)
    {
        var created = await timeOff.RequestAsync(request, ct);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        await timeOff.CancelAsync(id, ct);
        return NoContent();
    }

    [HttpGet("approvals")]
    public Task<IReadOnlyList<TimeOffApprovalDto>> GetApprovals(CancellationToken ct) => timeOff.GetApprovalsAsync(ct);

    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        await timeOff.ApproveAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/decline")]
    public async Task<IActionResult> Decline(Guid id, DeclineTimeOffRequest decline, CancellationToken ct)
    {
        await timeOff.DeclineAsync(id, decline, ct);
        return NoContent();
    }
}
