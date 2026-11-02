using Juggle.Api.Features.Jobs;
using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Workflow;

[ApiController]
[Route("api/jobs/{id:guid}")]
public sealed class JobActionsController(JobActions actions) : ControllerBase
{
    [HttpPost("request-information")]
    public Task<JobDetailDto> RequestInformation(Guid id, MessageRequest request, CancellationToken ct) =>
        actions.RequestInformationAsync(id, request, ct);

    [HttpPost("answer")]
    public Task<JobDetailDto> Answer(Guid id, MessageRequest request, CancellationToken ct) => actions.AnswerAsync(id, request, ct);

    [HttpPost("start")]
    public Task<JobDetailDto> Start(Guid id, CancellationToken ct) => actions.StartAsync(id, ct);

    [HttpPost("submit-artwork")]
    public Task<JobDetailDto> SubmitArtwork(Guid id, SubmitArtworkRequest request, CancellationToken ct) =>
        actions.SubmitArtworkAsync(id, request, ct);

    [HttpPost("approve-design")]
    public Task<JobDetailDto> ApproveDesign(Guid id, CommentRequest request, CancellationToken ct) =>
        actions.ApproveDesignAsync(id, request, ct);

    [HttpPost("send-back")]
    public Task<JobDetailDto> SendBack(Guid id, CommentRequest request, CancellationToken ct) => actions.SendBackAsync(id, request, ct);

    [HttpPost("mark-ready")]
    public Task<JobDetailDto> MarkReady(Guid id, CancellationToken ct) => actions.MarkReadyAsync(id, ct);

    [HttpPost("allocate")]
    public Task<AllocatedJobDto> Allocate(Guid id, AllocateRequest request, CancellationToken ct) =>
        actions.AllocateAsync(id, request, ct);

    [HttpPost("cancel")]
    public Task<JobDetailDto> Cancel(Guid id, MessageRequest request, CancellationToken ct) => actions.CancelAsync(id, request, ct);
}
