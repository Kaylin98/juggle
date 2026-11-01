namespace Juggle.Api.Data.Entities;

/// <summary>A column of an organisation's board, such as The Core Group's "In Design" (D64, D77).</summary>
public class BoardColumn
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public required string Name { get; set; }
    public int Order { get; set; }
}

/// <summary>
/// One of an organisation's detailed job statuses, in a board column (D69, D77). Its kind says whether a job in it is
/// still open, done or cancelled, so nothing needs to know a status by name.
/// </summary>
public class JobStatus
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid ColumnId { get; set; }
    public required string Name { get; set; }

    /// <summary>Where the status comes within its column and in lists such as reports.</summary>
    public int Order { get; set; }

    /// <summary>One of the 8 palette hues, for its status chip.</summary>
    public required string Colour { get; set; }

    public JobStatusKind Kind { get; set; }

    public BoardColumn Column { get; set; } = null!;
}

/// <summary>
/// One step of an organisation's workflow (D77): taking the action on a job in the from status moves it to the to
/// status, and records the approval stage, if any. Submit has no from status: it gives a new job its first status.
/// </summary>
public class WorkflowTransition
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public WorkflowAction Action { get; set; }
    public Guid? FromStatusId { get; set; }
    public Guid ToStatusId { get; set; }
    public ApprovalStage? Stage { get; set; }
}
