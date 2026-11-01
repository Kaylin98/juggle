namespace Juggle.Api.Data.Entities;

/// <summary>
/// A piece of work from a brief to its close (D68): the brief a marketing manager sent, its job ID, its status in the
/// organisation's workflow, and who does it and when.
/// </summary>
public class Job
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid TeamId { get; set; }
    public Guid DepartmentId { get; set; }

    /// <summary>Who sent the brief: always the user who was signed in (D67).</summary>
    public Guid RequesterUserId { get; set; }

    /// <summary>The brand's number for the job, from its counter when the brief is sent (D71).</summary>
    public int Number { get; set; }

    /// <summary>The job ID, set when the brief is sent and never changed (D63), such as DJI0143_Q1'27_Summer Holiday Sale.</summary>
    public required string Code { get; set; }

    public required string Title { get; set; }
    public string? MainGoal { get; set; }

    /// <summary>One deliverable per line, as typed.</summary>
    public string? Deliverables { get; set; }

    public DateOnly? RequiredDate { get; set; }
    public Priority Priority { get; set; }

    /// <summary>When the brief was sent: the date briefed.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    public Guid StatusId { get; set; }
    public Guid? DesignerPersonId { get; set; }
    public decimal? EstimateHours { get; set; }
    public DateOnly? PlannedStartDate { get; set; }
    public DateOnly? ExpectedCompletionDate { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }
    public Guid? ClosedByUserId { get; set; }

    public Team Team { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public User Requester { get; set; } = null!;
    public JobStatus Status { get; set; } = null!;
    public Person? Designer { get; set; }
}

/// <summary>Something done to a job, by whom and when (D72): the audit trail, written by every workflow action.</summary>
public class JobEvent
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid JobId { get; set; }
    public Guid UserId { get; set; }
    public DateTimeOffset At { get; set; }
    public WorkflowAction Action { get; set; }
    public Guid? FromStatusId { get; set; }
    public Guid ToStatusId { get; set; }

    /// <summary>What the user wrote with it, such as a request for information or the reason for cancelling.</summary>
    public string? Message { get; set; }
}
