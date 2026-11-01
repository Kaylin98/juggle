using System.ComponentModel.DataAnnotations;

namespace Juggle.Api.Features.Dashboard;

/// <param name="TeamId">A team id, or "all" for every team (ViewAllJobs only).</param>
public sealed record DashboardQuery([Required] string TeamId);

/// <param name="OverdueJobs">Per team in view, so "All teams" can link to each team's board.</param>
/// <param name="AwaitingApproval">Jobs waiting for an approval (D53, D77), per team in view.</param>
/// <param name="Incoming">Jobs in the incoming queue, per team in view.</param>
/// <param name="WorkByDepartment">Open jobs by brand, most first.</param>
public sealed record DashboardDto(
    IReadOnlyList<PersonUtilisationDto> People,
    IReadOnlyList<TeamCountDto> OverdueJobs,
    IReadOnlyList<TeamCountDto> AwaitingApproval,
    IReadOnlyList<TeamCountDto> Incoming,
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
