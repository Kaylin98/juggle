using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Workflow;

namespace Juggle.Api.Auth;

/// <summary>
/// Which workflow actions the signed-in user may take on a job (D70, D77): the workflow allows the action in the job's
/// status, the user's role has its capability, and for some actions they are the job's requester or designer.
/// </summary>
public sealed class JobActionAccess(CurrentUser currentUser, Permissions permissions, JobWorkflow workflow)
{
    /// <summary>The actions the user may take now. The job is read with its designer.</summary>
    public async Task<IReadOnlyList<WorkflowAction>> AvailableAsync(Job job, CancellationToken ct)
    {
        var capabilities = await permissions.GetAsync(ct);
        return (await workflow.ActionsFromAsync(job.StatusId, ct))
            .Where(a => ActionRules.For(a) is { } rule && capabilities.Contains(rule.Capability) && Owns(job, rule.By))
            .ToList();
    }

    /// <summary>The step that takes the action, or a refusal: 403 for a user who may not take it, 400 for a status it can't start from.</summary>
    public async Task<WorkflowTransition> EnsureAsync(Job job, WorkflowAction action, CancellationToken ct)
    {
        var rule = ActionRules.For(action) ?? throw new InvalidOperationException($"{action} is not taken on a job.");
        if (!await permissions.HasAsync(rule.Capability, ct) || !Owns(job, rule.By))
        {
            throw new ForbiddenException("Your role does not allow this.");
        }

        return await workflow.FindAsync(action, job.StatusId, ct)
            ?? throw new BadRequestException($"This can't be done while the job is \"{job.Status.Name}\".");
    }

    private bool Owns(Job job, ActionBy by) => by switch
    {
        ActionBy.Requester => job.RequesterUserId == currentUser.UserId,
        ActionBy.Designer => job.Designer?.UserId == currentUser.UserId,
        _ => true,
    };
}
