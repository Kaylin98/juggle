using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Workflow;

/// <summary>Who on a job may take an action besides having its capability (D77).</summary>
public enum ActionBy { Anyone, Requester, Designer }

/// <summary>The capability an action needs, and whether only the job's requester or designer may take it.</summary>
public sealed record ActionRule(Capability Capability, ActionBy By = ActionBy.Anyone);

/// <summary>
/// Who may take each workflow action, fixed in code (D77). Which statuses an action starts from is the organisation's
/// data. Submit is left out: it makes the job, so it is not taken on one.
/// </summary>
public static class ActionRules
{
    private static readonly Dictionary<WorkflowAction, ActionRule> Rules = new()
    {
        [WorkflowAction.RequestInformation] = new(Capability.TriageBriefs),
        [WorkflowAction.Answer] = new(Capability.SubmitBrief, ActionBy.Requester),
        [WorkflowAction.MarkReady] = new(Capability.TriageBriefs),
        [WorkflowAction.Cancel] = new(Capability.TriageBriefs),
        [WorkflowAction.AllocateAndSchedule] = new(Capability.Allocate),
        [WorkflowAction.Start] = new(Capability.WorkOnJobs, ActionBy.Designer),
        [WorkflowAction.SubmitForApproval] = new(Capability.WorkOnJobs, ActionBy.Designer),
        [WorkflowAction.ApproveDesign] = new(Capability.ApproveDesign),
        [WorkflowAction.SendBack] = new(Capability.ApproveDesign),
        [WorkflowAction.ApproveMarketing] = new(Capability.ApproveMarketing, ActionBy.Requester),
        [WorkflowAction.NeedsBusinessApproval] = new(Capability.ApproveMarketing, ActionBy.Requester),
        [WorkflowAction.RecordBusinessApproval] = new(Capability.ApproveMarketing, ActionBy.Requester),
        [WorkflowAction.RequestChanges] = new(Capability.ApproveMarketing, ActionBy.Requester),
        [WorkflowAction.Close] = new(Capability.CloseJob, ActionBy.Requester),
    };

    public static ActionRule? For(WorkflowAction action) => Rules.GetValueOrDefault(action);
}
