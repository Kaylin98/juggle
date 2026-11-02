namespace Juggle.Api.Data.Entities;

/// <summary>
/// What a role allows, fixed in code; each organisation gives its roles a set of these (D77). Nothing checks a role's
/// name. Without ViewAllJobs a user sees only the work they asked for or are assigned.
/// </summary>
public enum Capability
{
    SubmitBrief,
    TriageBriefs,
    Allocate,
    ViewSchedule,
    WorkOnJobs,
    ApproveDesign,
    ApproveMarketing,
    CloseJob,
    ViewAllJobs,
    ViewBoard,
    ViewReports,
    ApproveTimeOff,
    ManageUsers,
}

/// <summary>
/// The workflow actions, fixed in code (D77): what each does besides changing the status, and who may take it, is
/// code; which statuses it moves between is each organisation's data.
/// </summary>
public enum WorkflowAction
{
    Submit,
    RequestInformation,
    Answer,
    MarkReady,
    Cancel,
    AllocateAndSchedule,
    Start,
    SubmitForApproval,
    ApproveDesign,
    SendBack,
    ApproveMarketing,
    NeedsBusinessApproval,
    RecordBusinessApproval,
    RequestChanges,
    Close,

    /// <summary>Not a workflow step: logged when a booking moves a job to another designer.</summary>
    Reassign,

    /// <summary>Not a workflow step: logged when a booking's dates change.</summary>
    Reschedule,
}

/// <summary>The approval a workflow step records, so an organisation can leave a stage out (D72, D77).</summary>
public enum ApprovalStage { Design, Marketing, Business }

/// <summary>Whether a job in a status is still open, done, or cancelled (left out of completed counts, D75).</summary>
public enum JobStatusKind { Open, Done, Cancelled }

/// <summary>The kind of job (section 3.1A). A placeholder list until the client gives theirs (open question 8).</summary>
public enum JobCategory { Campaign, ProductLaunch, Promotion, RetailAndInStore, DigitalAndSocial, Event, Corporate, Other }

/// <summary>The kinds of deliverable in section 3.1C of the requirements, and Other.</summary>
public enum DeliverableType
{
    SocialMedia,
    WebsiteBanner,
    Email,
    DigitalAdvertising,
    Print,
    InStore,
    ProductArtwork,
    KeyVisual,
    Presentation,
    Packaging,
    Other,
}

public enum Priority { Low, Medium, High, Urgent }

public enum TimeOffType { AnnualLeave, SickLeave, FamilyResponsibility, StudyLeave, Other, PublicHoliday }

public enum TimeOffStatus { Pending, Approved, Declined, Cancelled }
