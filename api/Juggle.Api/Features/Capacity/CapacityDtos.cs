using System.ComponentModel.DataAnnotations;

namespace Juggle.Api.Features.Capacity;

/// <param name="TeamId">A team id, or "all" for every person in the organisation (Org Admin only).</param>
/// <param name="Start">Any date; the schedule starts on the Monday of its week.</param>
public sealed record CapacityQuery([Required] string TeamId, [Required] DateOnly? Start, [AllowedValues(1, 2, 4)] int Weeks = 1);

/// <param name="Days">The weekdays shown, in order.</param>
public sealed record CapacityDto(
    IReadOnlyList<DateOnly> Days,
    IReadOnlyList<CapacityPersonDto> People,
    IReadOnlyList<AllocationDto> Allocations);

public sealed record CapacityPersonDto(
    Guid Id,
    string Name,
    string AvatarColour,
    string JobTitle,
    decimal HoursPerDay,
    IReadOnlyList<DayLoad> Days);

/// <param name="OtherTeam">The project belongs to another team, so the bar is shown greyed.</param>
public sealed record AllocationDto(
    Guid Id,
    Guid PersonId,
    Guid ProjectId,
    string ProjectName,
    string ProjectColour,
    string TeamName,
    Guid? TaskId,
    DateOnly StartDate,
    DateOnly EndDate,
    decimal HoursPerDay,
    string? Notes,
    bool OtherTeam);
