using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Workflow;

/// <summary>
/// The organisation's workflow (D77), read once per request. Code asks it which statuses an action starts from or
/// leads to, so nothing depends on a status's name.
/// </summary>
public sealed class JobWorkflow(JuggleDbContext db)
{
    /// <summary>The actions that approve work, so a job in a status one of them starts from is awaiting approval.</summary>
    private static readonly WorkflowAction[] Approvals =
        [WorkflowAction.ApproveDesign, WorkflowAction.ApproveMarketing, WorkflowAction.RecordBusinessApproval];

    /// <summary>Whether the action approves work, so a user who may take it has a job to review.</summary>
    public static bool IsApproval(WorkflowAction action) => Approvals.Contains(action);

    private List<WorkflowTransition>? transitions;

    /// <summary>The status a sent brief starts in: where the organisation's Submit step leads.</summary>
    public async Task<Guid> FirstStatusIdAsync(CancellationToken ct) =>
        (await TransitionsAsync(ct)).Single(t => t.Action == WorkflowAction.Submit).ToStatusId;

    /// <summary>The step that takes the action on a job in the status, or null when the workflow has none.</summary>
    public async Task<WorkflowTransition?> FindAsync(WorkflowAction action, Guid fromStatusId, CancellationToken ct) =>
        (await TransitionsAsync(ct)).FirstOrDefault(t => t.Action == action && t.FromStatusId == fromStatusId);

    /// <summary>The actions the workflow allows on a job in the status.</summary>
    public async Task<IReadOnlyList<WorkflowAction>> ActionsFromAsync(Guid statusId, CancellationToken ct) =>
        (await TransitionsAsync(ct)).Where(t => t.FromStatusId == statusId).Select(t => t.Action).Distinct().ToList();

    /// <summary>The statuses the action leads to, such as those a job is in once Allocate and schedule has booked it.</summary>
    private async Task<IReadOnlySet<Guid>> StatusesAfterAsync(WorkflowAction action, CancellationToken ct) =>
        (await TransitionsAsync(ct)).Where(t => t.Action == action).Select(t => t.ToStatusId).ToHashSet();

    /// <summary>The statuses any of the actions can be taken from.</summary>
    private async Task<IReadOnlySet<Guid>> StatusesBeforeAsync(IReadOnlyCollection<WorkflowAction> actions, CancellationToken ct) =>
        (await TransitionsAsync(ct))
            .Where(t => actions.Contains(t.Action) && t.FromStatusId != null)
            .Select(t => t.FromStatusId!.Value)
            .ToHashSet();

    /// <summary>The statuses in which a job waits for an approval.</summary>
    public Task<IReadOnlySet<Guid>> AwaitingApprovalAsync(CancellationToken ct) => StatusesBeforeAsync(Approvals, ct);

    /// <summary>
    /// The statuses in which a job waits in the incoming queue, for the users who triage and book work: those Request
    /// information, Mark ready or Allocate and schedule start from. Cancel is left out, as it starts from any open status.
    /// </summary>
    public Task<IReadOnlySet<Guid>> IncomingAsync(CancellationToken ct) =>
        StatusesBeforeAsync([WorkflowAction.RequestInformation, WorkflowAction.MarkReady, WorkflowAction.AllocateAndSchedule], ct);

    /// <summary>The organisation's board: its columns, their statuses, and the statuses a scheduled job is in.</summary>
    public async Task<WorkflowDto> GetBoardAsync(CancellationToken ct)
    {
        var columns = await db.BoardColumns.OrderBy(c => c.Order).AsNoTracking().ToListAsync(ct);
        var statuses = await db.JobStatuses.OrderBy(s => s.Order).AsNoTracking().ToListAsync(ct);
        var scheduled = await StatusesAfterAsync(WorkflowAction.AllocateAndSchedule, ct);
        return new WorkflowDto(
            columns
                .Select(c => new BoardColumnDto(
                    c.Id,
                    c.Name,
                    statuses.Where(s => s.ColumnId == c.Id).Select(s => new JobStatusDto(s.Id, s.Name, s.Colour, s.Kind)).ToList()))
                .ToList(),
            [.. scheduled],
            (await TransitionsAsync(ct))
                .Where(t => t.FromStatusId != null)
                .Select(t => new WorkflowStepDto(t.Action, t.FromStatusId!.Value, t.ToStatusId))
                .ToList());
    }

    private async Task<List<WorkflowTransition>> TransitionsAsync(CancellationToken ct) =>
        transitions ??= await db.WorkflowTransitions.AsNoTracking().ToListAsync(ct);
}
