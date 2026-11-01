using System.ComponentModel.DataAnnotations;

namespace Juggle.Api.Features.Dashboard;

/// <param name="TeamId">A team id, or "all" for every team (ViewAllJobs only).</param>
public sealed record DashboardQuery([Required] string TeamId);

/// <param name="OverdueTasks">Per team in view, so "All teams" can link to each team's board.</param>
/// <param name="AwaitingReview">Open tasks in a Review-category status (D53), per team in view.</param>
/// <param name="TriageRequests">New requests waiting in triage, per team in view.</param>
/// <param name="WorkByDepartment">Open tasks by their project's department, most first.</param>
public sealed record DashboardDto(
    IReadOnlyList<PersonUtilisationDto> People,
    IReadOnlyList<TeamCountDto> OverdueTasks,
    IReadOnlyList<TeamCountDto> AwaitingReview,
    IReadOnlyList<TeamCountDto> TriageRequests,
    IReadOnlyList<DepartmentCountDto> WorkByDepartment);

/// <summary>Booked and available hours over a period. Capacity is 0 when the person has no working days in it.</summary>
public sealed record LoadDto(decimal Allocated, decimal Capacity);

/// <param name="NextFourWeeks">The four weeks after this one.</param>
/// <param name="OverThisWeek">At least one day this week is booked over capacity (D27).</param>
public sealed record PersonUtilisationDto(
    Guid Id,
    string Name,
    string AvatarColour,
    string JobTitle,
    LoadDto ThisWeek,
    LoadDto NextFourWeeks,
    bool OverThisWeek);

public sealed record TeamCountDto(Guid TeamId, string TeamName, int Count);

public sealed record DepartmentCountDto(string Department, int Count);
