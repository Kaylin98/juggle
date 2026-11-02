using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Jobs;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Files;

/// <summary>
/// Files attached to jobs. The user who briefed a job attaches its brief document and supporting material; the designer's
/// artwork files are stored when a version is submitted. A file opens only for users who can see its job, and an artwork
/// file only for those who may see the artwork (the user who briefed the job waits for the head of design's approval).
/// </summary>
public sealed class JobFilesService(
    JuggleDbContext db, CurrentUser currentUser, JobAccess jobAccess, IFileStore store, OrgClock clock)
{
    public async Task<JobFileDto> AddAsync(Guid jobId, FileKind kind, IFormFile file, CancellationToken ct)
    {
        if (kind == FileKind.Artwork)
        {
            throw new BadRequestException("Artwork is submitted with the job's Submit artwork step.");
        }

        var job = await db.Jobs.FirstOrDefaultAsync(j => j.Id == jobId, ct) ?? throw new NotFoundException("Job not found.");
        await jobAccess.EnsureCanSeeAsync(job, ct);
        if (job.RequesterUserId != currentUser.UserId)
        {
            throw new ForbiddenException("Only the user who briefed the job can attach files to it.");
        }

        var stored = await StoreAsync(job, kind, file, ct);
        await db.SaveChangesAsync(ct);
        var name = await db.Users.Where(u => u.Id == currentUser.UserId).Select(u => u.Name).FirstAsync(ct);
        return new JobFileDto(stored.Id, stored.Kind, stored.FileName, stored.SizeBytes, name, stored.UploadedAt);
    }

    /// <summary>Validates and keeps the file, and adds it to the job; the caller saves.</summary>
    public async Task<JobFile> StoreAsync(Job job, FileKind kind, IFormFile file, CancellationToken ct)
    {
        var contentType = FileRules.Validate(file);
        var stored = new JobFile
        {
            OrgId = job.OrgId,
            JobId = job.Id,
            Kind = kind,
            FileName = Path.GetFileName(file.FileName),
            ContentType = contentType,
            SizeBytes = file.Length,
            StorageKey = Guid.CreateVersion7().ToString("N"),
            UploadedByUserId = currentUser.UserId,
            UploadedAt = clock.Now,
        };
        await using var content = file.OpenReadStream();
        await store.SaveAsync(stored.StorageKey, content, contentType, ct);
        db.JobFiles.Add(stored);
        return stored;
    }

    /// <summary>The file and its bytes, for a user who may see the job (and, for artwork, the artwork).</summary>
    public async Task<(JobFile File, Stream Content)> OpenAsync(Guid jobId, Guid fileId, CancellationToken ct)
    {
        var job = await db.Jobs.FirstOrDefaultAsync(j => j.Id == jobId, ct) ?? throw new NotFoundException("Job not found.");
        await jobAccess.EnsureCanSeeAsync(job, ct);
        var file = await db.JobFiles.FirstOrDefaultAsync(f => f.Id == fileId && f.JobId == jobId, ct)
            ?? throw new NotFoundException("File not found.");
        if (file.Kind == FileKind.Artwork && !await CanSeeArtworkFileAsync(job, file, ct))
        {
            throw new ForbiddenException("This artwork is not available until the head of design has approved it.");
        }

        return (file, await store.OpenAsync(file.StorageKey, ct));
    }

    private async Task<bool> CanSeeArtworkFileAsync(Job job, JobFile file, CancellationToken ct) =>
        await jobAccess.CanSeeArtworkAsync(job, ct)
        || await db.JobArtwork.AnyAsync(
            a => a.FileId == file.Id
                && db.JobApprovals.Any(p => p.ArtworkId == a.Id && p.Stage == ApprovalStage.Design && p.Decision == ApprovalDecision.Approved),
            ct);
}
