using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Jobs;
using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Files;

[ApiController]
[Route("api/jobs/{jobId:guid}/files")]
public sealed class FilesController(JobFilesService files) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(FileRules.MaxRequestBytes)]
    public async Task<ActionResult<JobFileDto>> Add(Guid jobId, IFormFile file, [FromForm] FileKind kind, CancellationToken ct)
    {
        var added = await files.AddAsync(jobId, kind, file, ct);
        return StatusCode(StatusCodes.Status201Created, added);
    }

    /// <summary>Always a download, and never sniffed, so an uploaded file can't run as a page.</summary>
    [HttpGet("{fileId:guid}")]
    public async Task<IActionResult> Download(Guid jobId, Guid fileId, CancellationToken ct)
    {
        var (file, content) = await files.OpenAsync(jobId, fileId, ct);
        Response.Headers.XContentTypeOptions = "nosniff";
        return File(content, file.ContentType, file.FileName);
    }
}
