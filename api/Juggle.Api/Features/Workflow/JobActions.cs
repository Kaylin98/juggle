using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Allocations;
using Juggle.Api.Features.Jobs;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Workflow;

/// <summary>
/// The workflow actions on a job (D77). Each checks the user and the job's status through <see cref="JobActionAccess"/>,
/// does what the action does besides the status change, and writes a <see cref="JobEvent"/> (D72).
/// </summary>
public sealed class JobActions(
    JuggleDbContext db,
    CurrentUser currentUser,
    JobAccess jobAccess,
    JobActionAccess access,
    AllocationService allocations,
    JobsService jobs,
    OrgClock clock)
{
    public Task<JobDetailDto> RequestInformationAsync(Guid id, MessageRequest request, CancellationToken ct) =>
        MoveAsync(id, WorkflowAction.RequestInformation, request.Message, ct);

    /// <summary>The requester answers the traffic manager's question, which returns the job to the queue.</summary>
    public Task<JobDetailDto> AnswerAsync(Guid id, MessageRequest request, CancellationToken ct) =>
        MoveAsync(id, WorkflowAction.Answer, request.Message, ct);

    /// <summary>The head of design approves the design, which sends the artwork on to the marketing manager.</summary>
    public Task<JobDetailDto> ApproveDesignAsync(Guid id, CommentRequest request, CancellationToken ct) =>
        DecideAsync(id, WorkflowAction.ApproveDesign, ApprovalDecision.Approved, request.Comment, ct);

    /// <summary>The head of design sends the design back to the designer with what to change.</summary>
    public Task<JobDetailDto> SendBackAsync(Guid id, CommentRequest request, CancellationToken ct) =>
        DecideAsync(id, WorkflowAction.SendBack, ApprovalDecision.ChangesRequested, request.Comment, ct);

    /// <summary>The requester approves the artwork the head of design approved, which readies the job to close.</summary>
    public Task<JobDetailDto> ApproveMarketingAsync(Guid id, CommentRequest request, CancellationToken ct) =>
        DecideAsync(id, WorkflowAction.ApproveMarketing, ApprovalDecision.Approved, request.Comment, ct);

    /// <summary>The requester sends the artwork for a stakeholder's approval, saying who needs to give it.</summary>
    public Task<JobDetailDto> NeedsBusinessApprovalAsync(Guid id, MessageRequest request, CancellationToken ct) =>
        MoveAsync(id, WorkflowAction.NeedsBusinessApproval, request.Message, ct);

    /// <summary>The requester records that a stakeholder approved, with who, when, a note and a link to the evidence.</summary>
    public Task<JobDetailDto> RecordBusinessApprovalAsync(Guid id, BusinessApprovalRequest request, CancellationToken ct)
    {
        if (request.DecidedOn > clock.Today)
        {
            throw new BadRequestException("The approval can't be dated in the future.");
        }

        return DecideAsync(
            id, WorkflowAction.RecordBusinessApproval, ApprovalDecision.Approved, request.Note, ct,
            approval =>
            {
                approval.StakeholderName = request.StakeholderName.Trim();
                approval.DecidedOn = request.DecidedOn;
                approval.Link = string.IsNullOrWhiteSpace(request.Link) ? null : request.Link.Trim();
            });
    }

    /// <summary>
    /// The requester asks for changes to the artwork, or records that a stakeholder did. The job keeps its ID and goes
    /// back to the traffic manager as a new revision to schedule, never straight to the designer.
    /// </summary>
    public async Task<JobDetailDto> RequestChangesAsync(Guid id, RequestChangesRequest request, CancellationToken ct)
    {
        var job = await LoadAsync(id, ct);
        var transition = await access.EnsureAsync(job, WorkflowAction.RequestChanges, ct);
        var business = transition.Stage == ApprovalStage.Business;
        if (business && (string.IsNullOrWhiteSpace(request.StakeholderName) || request.DecidedOn is null))
        {
            throw new BadRequestException("Say who asked for the changes and when.");
        }
        if (request.DecidedOn > clock.Today || request.RevisedRequiredDate < clock.Today)
        {
            throw new BadRequestException("The decision can't be dated in the future, or the new deadline in the past.");
        }

        var reason = request.Reason.Trim();
        await RecordApprovalAsync(job, transition, ApprovalDecision.ChangesRequested, reason, approval =>
        {
            if (business)
            {
                approval.StakeholderName = request.StakeholderName!.Trim();
                approval.DecidedOn = request.DecidedOn;
                approval.Link = Clean(request.Link);
            }
        }, ct);
        var number = 1 + await db.JobRevisions.CountAsync(r => r.JobId == id, ct);
        db.JobRevisions.Add(new JobRevision
        {
            OrgId = job.OrgId,
            JobId = id,
            Number = number,
            Source = business ? RevisionSource.Business : RevisionSource.Marketing,
            RequestedByUserId = currentUser.UserId,
            RequestedAt = clock.Now,
            Reason = reason,
            Changes = Clean(request.Changes),
            RevisedRequiredDate = request.RevisedRequiredDate,
            Link = Clean(request.Link),
        });
        job.RequiredDate = request.RevisedRequiredDate ?? job.RequiredDate;
        Apply(job, WorkflowAction.RequestChanges, transition, reason);
        await db.SaveChangesAsync(ct);
        return await jobs.GetAsync(id, ct);
    }

    private static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    /// <summary>The requester closes the approved job.</summary>
    public async Task<JobDetailDto> CloseAsync(Guid id, CancellationToken ct)
    {
        var job = await LoadAsync(id, ct);
        Apply(job, WorkflowAction.Close, await access.EnsureAsync(job, WorkflowAction.Close, ct), null);
        job.ClosedAt = clock.Now;
        job.ClosedByUserId = currentUser.UserId;
        await db.SaveChangesAsync(ct);
        return await jobs.GetAsync(id, ct);
    }

    public Task<JobDetailDto> StartAsync(Guid id, CancellationToken ct) => MoveAsync(id, WorkflowAction.Start, null, ct);

    /// <summary>Records the next version of the artwork and sends the job for approval.</summary>
    public async Task<JobDetailDto> SubmitArtworkAsync(Guid id, SubmitArtworkRequest request, CancellationToken ct)
    {
        var job = await LoadAsync(id, ct);
        var transition = await access.EnsureAsync(job, WorkflowAction.SubmitForApproval, ct);
        var version = (await db.JobArtwork.Where(a => a.JobId == id).Select(a => (int?)a.Version).MaxAsync(ct) ?? 0) + 1;
        db.JobArtwork.Add(new JobArtwork
        {
            OrgId = job.OrgId,
            JobId = id,
            Version = version,
            Url = request.Url.Trim(),
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
            SubmittedByUserId = currentUser.UserId,
            SubmittedAt = clock.Now,
        });
        Apply(job, WorkflowAction.SubmitForApproval, transition, $"Version {version}");
        await db.SaveChangesAsync(ct);
        return await jobs.GetAsync(id, ct);
    }

    public Task<JobDetailDto> MarkReadyAsync(Guid id, CancellationToken ct) => MoveAsync(id, WorkflowAction.MarkReady, null, ct);

    /// <summary>Cancels an open job with the reason (D75).</summary>
    public Task<JobDetailDto> CancelAsync(Guid id, MessageRequest request, CancellationToken ct) =>
        MoveAsync(id, WorkflowAction.Cancel, request.Message, ct);

    /// <summary>
    /// Books the designer for the job and schedules it. The booking and the status change are saved together; as on the
    /// schedule, a clash or leave never blocks it, and the result lists them, and whether it ends after the required date.
    /// </summary>
    public async Task<AllocatedJobDto> AllocateAsync(Guid id, AllocateRequest request, CancellationToken ct)
    {
        var job = await LoadAsync(id, ct);
        var transition = await access.EnsureAsync(job, WorkflowAction.AllocateAndSchedule, ct);

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var booking = await allocations.CreateAsync(new SaveAllocationRequest(request.PersonId, id, request.StartDate, request.EndDate, request.HoursPerDay, null), ct);
        job.DesignerPersonId = request.PersonId;
        var revision = await OpenRevisionAsync(id, ct);
        if (revision is null)
        {
            job.EstimateHours = request.EstimateHours;
        }
        else
        {
            // The job's estimate is the total across the first round and every revision.
            revision.DesignerPersonId = request.PersonId;
            revision.EstimateHours = request.EstimateHours;
            job.EstimateHours = (job.EstimateHours ?? 0) + request.EstimateHours;
        }

        Apply(job, WorkflowAction.AllocateAndSchedule, transition, null);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return new AllocatedJobDto(
            await jobs.GetAsync(id, ct), booking.ClashDays, booking.LeaveDays, job.Deadline < request.EndDate);
    }

    private async Task<JobDetailDto> MoveAsync(Guid id, WorkflowAction action, string? message, CancellationToken ct)
    {
        var job = await LoadAsync(id, ct);
        Apply(job, action, await access.EnsureAsync(job, action, ct), message?.Trim());
        await db.SaveChangesAsync(ct);
        return await jobs.GetAsync(id, ct);
    }

    /// <summary>Moves the job and records the approval its step calls for, for the latest artwork (D72).</summary>
    private async Task<JobDetailDto> DecideAsync(
        Guid id, WorkflowAction action, ApprovalDecision decision, string? comment, CancellationToken ct,
        Action<JobApproval>? details = null)
    {
        var job = await LoadAsync(id, ct);
        var transition = await access.EnsureAsync(job, action, ct);
        comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
        if (decision == ApprovalDecision.ChangesRequested && comment is null)
        {
            throw new BadRequestException("Say what needs to change.");
        }
        await RecordApprovalAsync(job, transition, decision, comment, details, ct);
        if (action == WorkflowAction.ApproveDesign)
        {
            var revision = await OpenRevisionAsync(id, ct);
            revision?.CompletedAt = clock.Now;
        }

        Apply(job, action, transition, comment);
        await db.SaveChangesAsync(ct);
        return await jobs.GetAsync(id, ct);
    }

    /// <summary>Records the approval the step calls for, if it has a stage, for the latest artwork (D72).</summary>
    private async Task RecordApprovalAsync(
        Job job, WorkflowTransition transition, ApprovalDecision decision, string? comment, Action<JobApproval>? details, CancellationToken ct)
    {
        if (transition.Stage is not { } stage)
        {
            return;
        }

        var approval = new JobApproval
        {
            OrgId = job.OrgId,
            JobId = job.Id,
            Stage = stage,
            Decision = decision,
            ArtworkId = await LatestArtworkIdAsync(job.Id, ct),
            RecordedByUserId = currentUser.UserId,
            RecordedAt = clock.Now,
            Comment = comment,
        };
        details?.Invoke(approval);
        db.JobApprovals.Add(approval);
    }

    /// <summary>The revision being worked on: the latest one the head of design has not yet approved.</summary>
    private Task<JobRevision?> OpenRevisionAsync(Guid jobId, CancellationToken ct) =>
        db.JobRevisions.Where(r => r.JobId == jobId && r.CompletedAt == null).OrderByDescending(r => r.Number).FirstOrDefaultAsync(ct);

    private Task<Guid?> LatestArtworkIdAsync(Guid jobId, CancellationToken ct) =>
        db.JobArtwork.Where(a => a.JobId == jobId).OrderByDescending(a => a.Version).Select(a => (Guid?)a.Id).FirstOrDefaultAsync(ct);

    private async Task<Job> LoadAsync(Guid id, CancellationToken ct)
    {
        var job = await db.Jobs.Include(j => j.Status).Include(j => j.Designer).Include(j => j.Deliverables).FirstOrDefaultAsync(j => j.Id == id, ct)
            ?? throw new NotFoundException("Job not found.");
        await jobAccess.EnsureCanSeeAsync(job, ct);
        return job;
    }

    private void Apply(Job job, WorkflowAction action, WorkflowTransition transition, string? message)
    {
        db.JobEvents.Add(new JobEvent
        {
            OrgId = job.OrgId,
            JobId = job.Id,
            UserId = currentUser.UserId,
            At = clock.Now,
            Action = action,
            FromStatusId = job.StatusId,
            ToStatusId = transition.ToStatusId,
            Message = message,
        });
        job.StatusId = transition.ToStatusId;
    }
}
