using System.ComponentModel.DataAnnotations;

namespace Juggle.Api.Features.Allocations;

/// <summary>Creates or replaces an allocation. Dates are inclusive.</summary>
public sealed record SaveAllocationRequest(
    Guid PersonId,
    Guid ProjectId,
    Guid? TaskId,
    DateOnly StartDate,
    DateOnly EndDate,
    [Range(0.5, 24.0)] decimal HoursPerDay,
    [MaxLength(1000)] string? Notes);

/// <param name="ClashDays">Days of this allocation on which the person is now booked over capacity (D16).</param>
public sealed record SavedAllocationDto(
    Guid Id,
    Guid PersonId,
    Guid ProjectId,
    Guid? TaskId,
    DateOnly StartDate,
    DateOnly EndDate,
    decimal HoursPerDay,
    string? Notes,
    IReadOnlyList<DateOnly> ClashDays);
