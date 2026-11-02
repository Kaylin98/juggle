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

/// <summary>The artwork a designer submits for approval: a link to the file, with an optional note (D72).</summary>
public sealed record SubmitArtworkRequest([Required, MaxLength(1000), Url] string Url, [MaxLength(1000)] string? Note);

/// <summary>What a reviewer writes with a decision. Sending work back needs it; approving does not.</summary>
public sealed record CommentRequest([MaxLength(2000)] string? Comment);

/// <summary>
/// A stakeholder's approval that the marketing manager records (CD4): who decided, the day they decided, and the
/// evidence. Stakeholders have no logins.
/// </summary>
public sealed record BusinessApprovalRequest(
    [Required, MaxLength(200)] string StakeholderName,
    DateOnly DecidedOn,
    [MaxLength(2000)] string? Note,
    [MaxLength(1000), Url] string? Link);
