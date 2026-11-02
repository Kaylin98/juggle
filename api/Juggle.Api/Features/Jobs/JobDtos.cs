using System.ComponentModel.DataAnnotations;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Jobs;

/// <summary>A job on the board, in My requests and in lists (D68). Its full brief is in <see cref="JobDetailDto"/>.</summary>
/// <param name="Code">The job ID, fixed when the brief was sent (D63).</param>
/// <param name="Colour">The brand's colour, which its cards and bookings take (D61).</param>
/// <param name="ColumnId">The board column its status is in.</param>
/// <param name="StatusKind">Whether its status is open, done or cancelled.</param>
/// <param name="CreatedAt">When the brief was sent: the date briefed.</param>
/// <param name="Purpose">What the artwork is for (section 3.1B).</param>
/// <param name="Deliverables">Section 3.1C, in the order given.</param>
/// <param name="Deadline">The earliest of the required date and the deliverables' deadlines.</param>
/// <param name="IsOverdue">Open and the earliest deadline has passed (D21).</param>
/// <param name="IsDueSoon">Open and due within the next 7 days, or overdue (D57).</param>
/// <param name="AcceptsBookings">Open and still in Incoming or In Design, so it can be booked on the schedule.</param>
/// <param name="Bookings">Its bookings, earliest first.</param>
/// <param name="Actions">The workflow actions the signed-in user may take on it now (D70).</param>
/// <param name="RevisionCount">How many rounds of changes have been asked for after the first submission.</param>
public sealed record JobDto(
    Guid Id,
    Guid TeamId,
    string TeamName,
    string Code,
    string Title,
    Guid DepartmentId,
    string Department,
    string Colour,
    string RequesterName,
    Guid StatusId,
    Guid ColumnId,
    string StatusName,
    string StatusColour,
    JobStatusKind StatusKind,
    Priority Priority,
    DateOnly? RequiredDate,
    DateOnly? Deadline,
    DateTimeOffset CreatedAt,
    string? Purpose,
    IReadOnlyList<BriefDeliverable> Deliverables,
    Guid? DesignerPersonId,
    string? DesignerName,
    decimal? EstimateHours,
    DateOnly? PlannedStartDate,
    DateOnly? ExpectedCompletionDate,
    bool IsOverdue,
    bool IsDueSoon,
    bool AcceptsBookings,
    decimal BookedHours,
    IReadOnlyList<JobBookingDto> Bookings,
    IReadOnlyList<WorkflowAction> Actions,
    int RevisionCount)
{
    private const int DueSoonDays = 7;

    /// <summary>Bookings are for work still to be done: the board's first two columns, Incoming and In Design.</summary>
    public const int BookableColumns = 2;

    /// <summary>The jobs with what <see cref="From"/> maps, read without tracking.</summary>
    public static IQueryable<Job> Load(IQueryable<Job> jobs) => jobs
        .Include(j => j.Team)
        .Include(j => j.Department)
        .Include(j => j.Requester)
        .Include(j => j.Status).ThenInclude(s => s.Column)
        .Include(j => j.Designer).ThenInclude(p => p!.User)
        .Include(j => j.Deliverables.OrderBy(d => d.SortOrder))
        .AsSplitQuery()
        .AsNoTracking();

    /// <summary>Maps a job read with <see cref="Load"/>.</summary>
    public static JobDto From(Job job, DateOnly today, IEnumerable<JobBookingDto> bookings, IReadOnlyList<WorkflowAction> actions, int revisions)
    {
        var open = job.Status.Kind == JobStatusKind.Open;
        var linked = bookings.ToList();
        return new(
            job.Id,
            job.TeamId,
            job.Team.Name,
            job.Code,
            job.Title,
            job.DepartmentId,
            job.Department.Name,
            job.Department.Colour,
            job.Requester.Name,
            job.StatusId,
            job.Status.ColumnId,
            job.Status.Name,
            job.Status.Colour,
            job.Status.Kind,
            job.Priority,
            job.RequiredDate,
            job.Deadline,
            job.CreatedAt,
            job.Purpose,
            job.Deliverables.Select(d => new BriefDeliverable(d.Type, d.Description, d.Specifications, d.DueDate)).ToList(),
            job.DesignerPersonId,
            job.Designer?.User.Name,
            job.EstimateHours,
            job.PlannedStartDate,
            job.ExpectedCompletionDate,
            open && job.Deadline < today,
            open && job.Deadline <= today.AddDays(DueSoonDays),
            open && job.Status.Column.Order < BookableColumns,
            linked.Sum(b => b.Hours),
            linked,
            actions,
            revisions);
    }
}

/// <summary>A job, its whole brief and what has been done to it, for its own page.</summary>
/// <param name="History">Every action taken on the job, oldest first (D72).</param>
/// <param name="Artwork">The versions submitted, oldest first. The user who briefed the job sees none until the head of design has approved the design.</param>
/// <param name="Approvals">The approval decisions on the artwork, oldest first.</param>
/// <param name="Revisions">The rounds of changes asked for, oldest first.</param>
/// <param name="Files">The brief document and supporting material attached to the job, oldest first.</param>
/// <param name="CanAttachFiles">The signed-in user briefed the job, so may attach files to it.</param>
public sealed record JobDetailDto(
    JobDto Job,
    BriefDto Brief,
    IReadOnlyList<JobEventDto> History,
    IReadOnlyList<ArtworkDto> Artwork,
    IReadOnlyList<ApprovalDto> Approvals,
    IReadOnlyList<RevisionDto> Revisions,
    IReadOnlyList<JobFileDto> Files,
    bool CanAttachFiles);

/// <param name="ToStatusName">The status the action left the job in.</param>
/// <param name="Message">What the user wrote with it, such as a question or the reason for cancelling.</param>
public sealed record JobEventDto(DateTimeOffset At, WorkflowAction Action, string UserName, string ToStatusName, string? Message);

/// <summary>The parts of the brief (section 3.1) that are not on <see cref="JobDto"/>.</summary>
/// <param name="RevisesJobCode">The job ID of the job this brief revises; null for a new job.</param>
public sealed record BriefDto(
    string? Campaign,
    JobCategory? Category,
    string? RevisesJobCode,
    BriefObjectives Objectives,
    CreativeGuidelines Guidelines,
    IReadOnlyList<BriefLink> Links,
    string? AdditionalInformation)
{
    /// <summary>Maps a job read with its links.</summary>
    public static BriefDto From(Job job) => new(
        job.Campaign,
        job.Category,
        job.RevisesJobCode,
        new BriefObjectives(job.Purpose, job.Objective, job.TargetAudience, job.KeyMessage, job.Channels, job.ExpectedOutcome),
        new CreativeGuidelines(
            job.CreativeDirection, job.BrandRequirements, job.ColoursAndTypography, job.DesignReferences, job.MandatoryMessaging,
            job.RequiredLogos, job.ProductImagery, job.LegalDisclaimers, job.CreativeInstructions),
        job.Links.Select(l => new BriefLink(l.Url, l.Label)).ToList(),
        job.AdditionalInformation);
}

/// <param name="Hours">Hours per day on each of the person's working days from the start to the end date.</param>
public sealed record JobBookingDto(Guid PersonId, string PersonName, DateOnly StartDate, DateOnly EndDate, decimal HoursPerDay, decimal Hours);

public sealed record OptionDto(Guid Id, string Name);

/// <summary>A team to brief, with its colour for the dot beside its name.</summary>
public sealed record TeamOptionDto(Guid Id, string Name, string Colour);

/// <summary>What the brief form offers. The brand defaults to the first brand the user manages (D58).</summary>
public sealed record JobOptionsDto(
    IReadOnlyList<TeamOptionDto> Teams,
    IReadOnlyList<OptionDto> Departments,
    IReadOnlyList<Priority> Priorities,
    IReadOnlyList<JobCategory> Categories,
    IReadOnlyList<DeliverableType> DeliverableTypes,
    Guid? MyDepartmentId);

/// <summary>
/// A brief in the client's template, sections A to F of 3.1 (D50, J.4). The signed-in user sends it (D67); the date
/// briefed is when it arrives.
/// </summary>
/// <param name="RevisesJobCode">For a revision of an existing job, that job's ID; null for a new job.</param>
public sealed record CreateJobRequest(
    Guid TeamId,
    Guid DepartmentId,
    [Required, MaxLength(200)] string Title,
    [MaxLength(200)] string? Campaign,
    JobCategory? Category,
    [MaxLength(300)] string? RevisesJobCode,
    DateOnly? RequiredDate,
    Priority Priority,
    BriefObjectives Objectives,
    [MaxLength(20)] IReadOnlyList<BriefDeliverable> Deliverables,
    CreativeGuidelines Guidelines,
    [MaxLength(20)] IReadOnlyList<BriefLink> Links,
    [MaxLength(2000)] string? AdditionalInformation);

/// <summary>B. Brief objectives.</summary>
/// <param name="Purpose">What the artwork is for.</param>
/// <param name="Objective">The campaign or communication objective.</param>
/// <param name="Channels">The platforms or channels it will run on.</param>
public sealed record BriefObjectives(
    [MaxLength(2000)] string? Purpose,
    [MaxLength(1000)] string? Objective,
    [MaxLength(1000)] string? TargetAudience,
    [MaxLength(1000)] string? KeyMessage,
    [MaxLength(1000)] string? Channels,
    [MaxLength(1000)] string? ExpectedOutcome);

/// <summary>C. One required deliverable, with its own specifications and deadline.</summary>
/// <param name="Specifications">Dimensions and specifications, such as "1080 x 1350, PNG".</param>
public sealed record BriefDeliverable(
    DeliverableType Type,
    [Required, MaxLength(200)] string Description,
    [MaxLength(500)] string? Specifications,
    DateOnly? DueDate);

/// <summary>D. Creative guidelines.</summary>
/// <param name="BrandRequirements">Brand identity and CI requirements.</param>
/// <param name="CreativeInstructions">Any other creative instructions.</param>
public sealed record CreativeGuidelines(
    [MaxLength(1000)] string? CreativeDirection,
    [MaxLength(1000)] string? BrandRequirements,
    [MaxLength(1000)] string? ColoursAndTypography,
    [MaxLength(1000)] string? DesignReferences,
    [MaxLength(1000)] string? MandatoryMessaging,
    [MaxLength(1000)] string? RequiredLogos,
    [MaxLength(1000)] string? ProductImagery,
    [MaxLength(1000)] string? LegalDisclaimers,
    [MaxLength(1000)] string? CreativeInstructions);

/// <summary>E. Supporting material: a link to existing artwork, guidelines, images or a cloud folder, with a label.</summary>
public sealed record BriefLink([Required, MaxLength(1000), Url] string Url, [MaxLength(200)] string? Label);

/// <summary>A file attached to a job. It opens at <c>/api/jobs/{id}/files/{fileId}</c> for anyone who can see the job.</summary>
public sealed record JobFileDto(Guid Id, FileKind Kind, string FileName, long SizeBytes, string UploadedByName, DateTimeOffset UploadedAt);

/// <summary>A version of the artwork submitted for approval (D72): a link, or an uploaded file.</summary>
public sealed record ArtworkDto(int Version, string? Url, JobFileDto? File, string? Note, string SubmittedByName, DateTimeOffset SubmittedAt);

/// <summary>An approval decision on the artwork (D72).</summary>
/// <param name="Version">The artwork version reviewed.</param>
/// <param name="StakeholderName">Business approval only: who decided.</param>
/// <param name="DecidedOn">Business approval only: the day they decided.</param>
public sealed record ApprovalDto(
    ApprovalStage Stage,
    ApprovalDecision Decision,
    int? Version,
    string ReviewerName,
    DateTimeOffset RecordedAt,
    string? Comment,
    string? StakeholderName,
    DateOnly? DecidedOn,
    string? Link);

/// <summary>A job waiting for the signed-in user's approval, with the artwork to review.</summary>
public sealed record QueuedJobDto(JobDto Job, ArtworkDto? Artwork);

/// <summary>A round of changes asked for after the artwork was submitted (D72).</summary>
/// <param name="DesignerName">Who the traffic manager scheduled to make them; null until scheduled.</param>
/// <param name="CompletedAt">When the head of design approved the revised design.</param>
public sealed record RevisionDto(
    int Number,
    RevisionSource Source,
    string RequestedByName,
    DateTimeOffset RequestedAt,
    string Reason,
    string? Changes,
    DateOnly? RevisedRequiredDate,
    string? Link,
    string? DesignerName,
    decimal? EstimateHours,
    DateTimeOffset? CompletedAt);
