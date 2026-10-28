using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Allocations;

[ApiController]
[Route("api/allocations")]
public sealed class AllocationsController(AllocationService allocations) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<SavedAllocationDto>> Create(SaveAllocationRequest request, CancellationToken ct)
    {
        var saved = await allocations.CreateAsync(request, ct);
        return StatusCode(StatusCodes.Status201Created, saved);
    }

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
