using System.ComponentModel.DataAnnotations;
using Juggle.Api.Features.Jobs;

namespace Juggle.Api.Features.Workflow;

/// <summary>What the user wrote with an action: a request for information, or the reason for cancelling (D75).</summary>
public sealed record MessageRequest([Required, MaxLength(2000)] string Message);

/// <summary>Allocate and schedule: who does the job, for how long in all, and the booking that schedules them. Dates are inclusive.</summary>
public sealed record AllocateRequest(
    Guid PersonId,
    DateOnly StartDate,
    DateOnly EndDate,
    [Range(0.5, 24.0)] decimal HoursPerDay,
    [Range(0.5, 2000.0)] decimal EstimateHours);

/// <param name="ClashDays">Days of the booking on which the designer is now over capacity.</param>
/// <param name="LeaveDays">Days of the booking on which the designer is on approved leave.</param>
/// <param name="AfterRequiredDate">The booking ends after the date the job is required.</param>
public sealed record AllocatedJobDto(
    JobDetailDto Job,
    IReadOnlyList<DateOnly> ClashDays,
    IReadOnlyList<DateOnly> LeaveDays,
    bool AfterRequiredDate);
