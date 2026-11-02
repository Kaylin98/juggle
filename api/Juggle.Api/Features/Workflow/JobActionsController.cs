using Juggle.Api.Features.Files;
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

    [HttpPost("submit-artwork-file")]
    [RequestSizeLimit(FileRules.MaxRequestBytes)]
    public Task<JobDetailDto> SubmitArtworkFile(Guid id, IFormFile file, [FromForm] string? note, CancellationToken ct) =>
        actions.SubmitArtworkFileAsync(id, file, note, ct);

    [HttpPost("approve-design")]
    public Task<JobDetailDto> ApproveDesign(Guid id, CommentRequest request, CancellationToken ct) =>
        actions.ApproveDesignAsync(id, request, ct);

    [HttpPost("send-back")]
    public Task<JobDetailDto> SendBack(Guid id, CommentRequest request, CancellationToken ct) => actions.SendBackAsync(id, request, ct);

    [HttpPost("approve-marketing")]
    public Task<JobDetailDto> ApproveMarketing(Guid id, ApproveRequest request, CancellationToken ct) =>
        actions.ApproveMarketingAsync(id, request, ct);

    [HttpPost("needs-business-approval")]
    public Task<JobDetailDto> NeedsBusinessApproval(Guid id, MessageRequest request, CancellationToken ct) =>
        actions.NeedsBusinessApprovalAsync(id, request, ct);

    [HttpPost("record-business-approval")]
    public Task<JobDetailDto> RecordBusinessApproval(Guid id, BusinessApprovalRequest request, CancellationToken ct) =>
        actions.RecordBusinessApprovalAsync(id, request, ct);

    [HttpPost("request-changes")]
    public Task<JobDetailDto> RequestChanges(Guid id, RequestChangesRequest request, CancellationToken ct) =>
        actions.RequestChangesAsync(id, request, ct);

    [HttpPost("close")]
    public Task<JobDetailDto> Close(Guid id, CancellationToken ct) => actions.CloseAsync(id, ct);

    [HttpPost("mark-ready")]
    public Task<JobDetailDto> MarkReady(Guid id, CancellationToken ct) => actions.MarkReadyAsync(id, ct);

    [HttpPost("allocate")]
    public Task<AllocatedJobDto> Allocate(Guid id, AllocateRequest request, CancellationToken ct) =>
        actions.AllocateAsync(id, request, ct);

    [HttpPost("cancel")]
    public Task<JobDetailDto> Cancel(Guid id, MessageRequest request, CancellationToken ct) => actions.CancelAsync(id, request, ct);
}
