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

public enum StatusCategory { Todo, InProgress, Review, Done }

public enum RequestStatus { New, Accepted, Rejected }

public enum Priority { Low, Medium, High, Urgent }

public enum TimeOffType { AnnualLeave, SickLeave, FamilyResponsibility, StudyLeave, Other, PublicHoliday }

public enum TimeOffStatus { Pending, Approved, Declined, Cancelled }
