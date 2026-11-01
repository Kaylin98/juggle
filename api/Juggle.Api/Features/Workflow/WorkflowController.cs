using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Workflow;

[ApiController]
public sealed class WorkflowController(JobWorkflow workflow) : ControllerBase
{
    [HttpGet("api/workflow")]
    public Task<WorkflowDto> Get(CancellationToken ct) => workflow.GetBoardAsync(ct);
}
