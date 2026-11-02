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
        job.EstimateHours = request.EstimateHours;
        Apply(job, WorkflowAction.AllocateAndSchedule, transition, null);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        return new AllocatedJobDto(
            await jobs.GetAsync(id, ct), booking.ClashDays, booking.LeaveDays, job.RequiredDate < request.EndDate);
    }

    private async Task<JobDetailDto> MoveAsync(Guid id, WorkflowAction action, string? message, CancellationToken ct)
    {
        var job = await LoadAsync(id, ct);
        Apply(job, action, await access.EnsureAsync(job, action, ct), message?.Trim());
        await db.SaveChangesAsync(ct);
        return await jobs.GetAsync(id, ct);
    }

    private async Task<Job> LoadAsync(Guid id, CancellationToken ct)
    {
        var job = await db.Jobs.Include(j => j.Status).Include(j => j.Designer).FirstOrDefaultAsync(j => j.Id == id, ct)
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
