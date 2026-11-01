using System.ComponentModel.DataAnnotations;
using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Capacity;

/// <param name="TeamId">A team id, or "all" for every person in the organisation (ViewAllJobs only).</param>
/// <param name="Start">Any date; the schedule starts on the Monday of its week.</param>
public sealed record CapacityQuery([Required] string TeamId, [Required] DateOnly? Start, [AllowedValues(1, 2, 4, 8)] int Weeks = 1);

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

/// <param name="JobCode">The job ID, which the bar shows.</param>
/// <param name="Colour">The job's brand colour, which its bookings take (D61).</param>
/// <param name="OtherTeam">The job belongs to another team, so the bar is shown greyed.</param>
public sealed record AllocationDto(
    Guid Id,
    Guid PersonId,
    Guid JobId,
    string JobCode,
    string Colour,
    string Department,
    string TeamName,
    DateOnly StartDate,
    DateOnly EndDate,
    decimal HoursPerDay,
    string? Notes,
    bool OtherTeam)
{
    /// <summary>Maps an allocation loaded with its job and the job's department.</summary>
    public static AllocationDto From(Allocation a, string teamName, bool otherTeam) => new(
        a.Id,
        a.PersonId,
        a.JobId,
        a.Job.Code,
        a.Job.Department.Colour,
        a.Job.Department.Name,
        teamName,
        a.StartDate,
        a.EndDate,
        a.HoursPerDay,
        a.Notes,
        otherTeam);
}
