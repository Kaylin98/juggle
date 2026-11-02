using System.ComponentModel.DataAnnotations;

namespace Juggle.Api.Features.Allocations;

/// <summary>Creates or replaces an allocation. Dates are inclusive.</summary>
public sealed record SaveAllocationRequest(
    Guid PersonId,
    Guid JobId,
    DateOnly StartDate,
    DateOnly EndDate,
    [Range(0.5, 24.0)] decimal HoursPerDay,
    [MaxLength(1000)] string? Notes);

/// <param name="ClashDays">Days of this allocation on which the person is now booked over capacity (D16).</param>
/// <param name="LeaveDays">Days of this allocation on which the person is on approved leave.</param>
public sealed record SavedAllocationDto(
    Guid Id,
    Guid PersonId,
    Guid JobId,
    DateOnly StartDate,
    DateOnly EndDate,
    decimal HoursPerDay,
    string? Notes,
    IReadOnlyList<DateOnly> ClashDays,
    IReadOnlyList<DateOnly> LeaveDays);

/// <summary>A booking to check before it is saved. <paramref name="ExceptAllocationId"/> is the booking being changed, if any.</summary>
public sealed record AllocationCheckQuery(
    Guid JobId,
    Guid PersonId,
    DateOnly StartDate,
    DateOnly EndDate,
    [Range(0.5, 24.0)] decimal HoursPerDay,
    Guid? ExceptAllocationId);

/// <param name="ClashDays">Days on which the booking would put the person over capacity.</param>
/// <param name="LeaveDays">Days of the booking on which the person is on approved leave.</param>
/// <param name="Deadline">The job's earliest deadline; null when it has none.</param>
/// <param name="WorkingDaysLate">The person's working days between the deadline and the booking's end; 0 when it finishes in time.</param>
/// <param name="WorkingDaysToDeadline">The person's working days from the start to the deadline, inclusive; 0 when the deadline has gone or there is none.</param>
public sealed record AllocationCheckDto(
    IReadOnlyList<DateOnly> ClashDays,
    IReadOnlyList<DateOnly> LeaveDays,
    DateOnly? Deadline,
    int WorkingDaysLate,
    int WorkingDaysToDeadline);

/// <param name="FreeHours">Capacity less bookings over the days asked about.</param>
public sealed record PersonAvailabilityDto(Guid PersonId, decimal FreeHours);

/// <summary>Moves a job, with all its bookings, to another person.</summary>
public sealed record ReassignRequest(Guid PersonId);

/// <param name="ClashDays">Days of the moved bookings on which the new designer is over capacity.</param>
/// <param name="LeaveDays">Days of the moved bookings on which the new designer is on approved leave.</param>
public sealed record ReassignedJobDto(IReadOnlyList<DateOnly> ClashDays, IReadOnlyList<DateOnly> LeaveDays);
