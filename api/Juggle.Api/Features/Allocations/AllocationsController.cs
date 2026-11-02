using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Allocations;

[ApiController]
[Route("api/allocations")]
public sealed class AllocationsController(AllocationService allocations, AllocationChecks checks) : ControllerBase
{
    /// <summary>What a booking would run into, before it is saved.</summary>
    [HttpGet("check")]
    public Task<AllocationCheckDto> Check([FromQuery] AllocationCheckQuery query, CancellationToken ct) => checks.CheckAsync(query, ct);

    /// <summary>The hours each person in the team has free over the days.</summary>
    [HttpGet("availability")]
    public Task<IReadOnlyList<PersonAvailabilityDto>> Availability(Guid teamId, DateOnly startDate, DateOnly endDate, CancellationToken ct) =>
        checks.AvailabilityAsync(teamId, startDate, endDate, ct);

    [HttpPost]
    public async Task<ActionResult<SavedAllocationDto>> Create(SaveAllocationRequest request, CancellationToken ct)
    {
        var saved = await allocations.BookAsync(request, ct);
        return StatusCode(StatusCodes.Status201Created, saved);
    }

    /// <summary>Moves the job, with all its bookings, to another designer.</summary>
    [HttpPost("~/api/jobs/{jobId:guid}/reassign")]
    public Task<ReassignedJobDto> Reassign(Guid jobId, ReassignRequest request, CancellationToken ct) =>
        allocations.ReassignAsync(jobId, request, ct);

    [HttpPut("{id:guid}")]
    public Task<SavedAllocationDto> Update(Guid id, SaveAllocationRequest request, CancellationToken ct) =>
        allocations.UpdateAsync(id, request, ct);

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await allocations.DeleteAsync(id, ct);
        return NoContent();
    }
}
