using System.ComponentModel.DataAnnotations;
using Juggle.Api.Common;
using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.TimeOffRequests;

/// <summary>Asks for time off for the signed-in person. Dates are inclusive.</summary>
public sealed record RequestTimeOffRequest(
    TimeOffType Type,
    DateOnly StartDate,
    DateOnly EndDate,
    [MaxLength(500)] string? Note);

public sealed record DeclineTimeOffRequest([Required, MaxLength(500)] string Reason);

/// <summary>The signed-in person's own time off, with its status and, once declined, the reason.</summary>
/// <param name="WorkingDays">Weekdays in the range that are not public holidays.</param>
public sealed record MyTimeOffDto(
    Guid Id,
    TimeOffType Type,
    string Label,
    TimeOffStatus Status,
    DateOnly StartDate,
    DateOnly EndDate,
    int WorkingDays,
    string? Note,
    string? DeclineReason)
{
    /// <summary>The person sees their own sick leave, so nothing is hidden here.</summary>
    public static MyTimeOffDto From(TimeOff t, IReadOnlySet<DateOnly> holidays) => new(
        t.Id,
        t.Type,
        TimeOffLabels.For(t),
        t.Status,
        t.StartDate,
        t.EndDate,
        t.StartDate.WorkingDaysTo(t.EndDate, holidays),
        t.Note,
        t.DeclineReason);
}

/// <summary>A pending request, for an approver: one of the person's team admins, or an Org Admin.</summary>
/// <param name="Teams">The person's teams, by name.</param>
public sealed record TimeOffApprovalDto(
    Guid Id,
    Guid PersonId,
    string PersonName,
    string AvatarColour,
    string JobTitle,
    IReadOnlyList<string> Teams,
    string Label,
    DateOnly StartDate,
    DateOnly EndDate,
    int WorkingDays,
    string? Note);
