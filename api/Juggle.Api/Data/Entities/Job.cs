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

    // A. Job information (section 3.1 of the requirements)

    public required string Title { get; set; }
    public string? Campaign { get; set; }
    public JobCategory? Category { get; set; }

    /// <summary>The job ID of the job this brief revises, as the marketing manager gave it; null for a new job.</summary>
    public string? RevisesJobCode { get; set; }

    public DateOnly? RequiredDate { get; set; }
    public Priority Priority { get; set; }

    // B. Brief objectives

    /// <summary>What the artwork is for.</summary>
    public string? Purpose { get; set; }
    public string? Objective { get; set; }
    public string? TargetAudience { get; set; }
    public string? KeyMessage { get; set; }
    public string? Channels { get; set; }
    public string? ExpectedOutcome { get; set; }

    // D. Creative guidelines

    public string? CreativeDirection { get; set; }
    public string? BrandRequirements { get; set; }
    public string? ColoursAndTypography { get; set; }
    public string? DesignReferences { get; set; }
    public string? MandatoryMessaging { get; set; }
    public string? RequiredLogos { get; set; }
    public string? ProductImagery { get; set; }
    public string? LegalDisclaimers { get; set; }
    public string? CreativeInstructions { get; set; }

    // F. Additional information

    public string? AdditionalInformation { get; set; }

    /// <summary>When the brief was sent: the date briefed.</summary>
    public DateTimeOffset CreatedAt { get; set; }

    public Guid StatusId { get; set; }
    public Guid? DesignerPersonId { get; set; }
    public decimal? EstimateHours { get; set; }
    public DateOnly? PlannedStartDate { get; set; }
    public DateOnly? ExpectedCompletionDate { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }
    public Guid? ClosedByUserId { get; set; }

    /// <summary>The earliest deadline: the required date or the earliest deliverable's. Needs <see cref="Deliverables"/> loaded.</summary>
    public DateOnly? Deadline => Deliverables.Select(d => d.DueDate).Append(RequiredDate).Min();

    public Team Team { get; set; } = null!;
    public Department Department { get; set; } = null!;
    public User Requester { get; set; } = null!;
    public JobStatus Status { get; set; } = null!;
    public Person? Designer { get; set; }

    /// <summary>C. Required deliverables, in the order given.</summary>
    public List<JobDeliverable> Deliverables { get; set; } = [];

    /// <summary>E. Supporting material, as links, in the order given.</summary>
    public List<JobLink> Links { get; set; } = [];
}

/// <summary>One of a brief's deliverables (section 3.1C), with its own specifications and deadline.</summary>
public class JobDeliverable
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid JobId { get; set; }
    public int SortOrder { get; set; }
    public DeliverableType Type { get; set; }
    public required string Description { get; set; }

    /// <summary>Dimensions and specifications, such as "1080 x 1350, PNG".</summary>
    public string? Specifications { get; set; }

    public DateOnly? DueDate { get; set; }
}

/// <summary>Supporting material for a brief (section 3.1E): a link, such as a SharePoint folder, with a label.</summary>
public class JobLink
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid JobId { get; set; }
    public int SortOrder { get; set; }
    public required string Url { get; set; }
    public string? Label { get; set; }
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

/// <summary>One version of the artwork a designer submitted for approval (D72): a link now, a file in the MVP.</summary>
public class JobArtwork
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid JobId { get; set; }

    /// <summary>1 for the first submission, counting up for each later one on the job.</summary>
    public int Version { get; set; }

    public required string Url { get; set; }
    public string? Note { get; set; }
    public Guid SubmittedByUserId { get; set; }
    public DateTimeOffset SubmittedAt { get; set; }
}

/// <summary>
/// An approval decision on a job's artwork (D72): the head of design's, the marketing manager's, or a stakeholder's
/// that the marketing manager recorded. It is kept with who decided, when, and the version they reviewed.
/// </summary>
public class JobApproval
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid JobId { get; set; }
    public ApprovalStage Stage { get; set; }
    public ApprovalDecision Decision { get; set; }

    /// <summary>The artwork version reviewed: the latest when the decision was made.</summary>
    public Guid? ArtworkId { get; set; }

    public Guid RecordedByUserId { get; set; }
    public DateTimeOffset RecordedAt { get; set; }
    public string? Comment { get; set; }

    /// <summary>Business approval only: who decided, such as "Sales".</summary>
    public string? StakeholderName { get; set; }

    /// <summary>Business approval only: the day the stakeholder decided, which may be before it was recorded.</summary>
    public DateOnly? DecidedOn { get; set; }

    /// <summary>Business approval only: a link to the evidence, such as an email.</summary>
    public string? Link { get; set; }
}

/// <summary>
/// A round of changes asked for after the artwork was submitted (D72): it keeps the job's ID, goes to the traffic
/// manager to schedule, and is worked and approved like the first round.
/// </summary>
public class JobRevision
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid JobId { get; set; }

    /// <summary>1 for the first revision of the job, counting up.</summary>
    public int Number { get; set; }

    public RevisionSource Source { get; set; }
    public Guid RequestedByUserId { get; set; }
    public DateTimeOffset RequestedAt { get; set; }
    public required string Reason { get; set; }
    public string? Changes { get; set; }
    public DateOnly? RevisedRequiredDate { get; set; }
    public string? Link { get; set; }

    /// <summary>Set when the traffic manager schedules the revision.</summary>
    public Guid? DesignerPersonId { get; set; }

    public decimal? EstimateHours { get; set; }

    /// <summary>When the head of design approved the revised design.</summary>
    public DateTimeOffset? CompletedAt { get; set; }
}
