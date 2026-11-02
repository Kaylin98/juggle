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

    /// <summary>
    /// A download, never sniffed, so an uploaded file can't run as a page. With <c>inline=true</c> an image or PDF opens in the
    /// browser instead, sandboxed so an SVG's scripts can't run.
    /// </summary>
    [HttpGet("{fileId:guid}")]
    public async Task<IActionResult> Download(Guid jobId, Guid fileId, CancellationToken ct, bool inline = false)
    {
        var (file, content) = await files.OpenAsync(jobId, fileId, ct);
        Response.Headers.XContentTypeOptions = "nosniff";
        if (inline && FileRules.OpensInBrowser(file.ContentType))
        {
            if (file.ContentType.StartsWith("image/", StringComparison.Ordinal))
            {
                Response.Headers.ContentSecurityPolicy = "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:";
            }

            return File(content, file.ContentType);
        }

        return File(content, file.ContentType, file.FileName);
    }
}
