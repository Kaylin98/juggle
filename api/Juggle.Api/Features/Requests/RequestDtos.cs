using System.ComponentModel.DataAnnotations;
using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Requests;

public sealed record OptionDto(Guid Id, string Name);

/// <summary>A team to ask, with its colour for the dot beside its name.</summary>
public sealed record TeamOptionDto(Guid Id, string Name, string Colour);

/// <summary>Someone to name as the marketing manager, with their avatar colour.</summary>
public sealed record UserOptionDto(Guid Id, string Name, string AvatarColour);

/// <summary>
/// What the request form offers. Any team can be asked for work; the department defaults to the user's own.
/// Marketing managers are the users with a department, and the user.
/// </summary>
public sealed record RequestOptionsDto(
    IReadOnlyList<TeamOptionDto> Teams,
    IReadOnlyList<OptionDto> Departments,
    IReadOnlyList<UserOptionDto> MarketingManagers,
    IReadOnlyList<Priority> Priorities,
    Guid? MyDepartmentId);

/// <param name="Title">The job name.</param>
/// <param name="Deliverables">One per line as typed, without empty lines or bullets.</param>
/// <param name="RequestedDueDate">The studio deadline.</param>
/// <param name="CreatedAt">When it was briefed in.</param>
/// <param name="AssigneeName">Once accepted: who does the work, from the task (it follows reassignment).</param>
/// <param name="CommittedDueDate">Once accepted: the task's due date, which the team committed to.</param>
public sealed record RequestDto(
    Guid Id,
    Guid TeamId,
    string TeamName,
    string Title,
    string? MainGoal,
    IReadOnlyList<string> Deliverables,
    string Department,
    string RequesterName,
    string? MarketingManagerName,
    DateOnly? RequestedDueDate,
    Priority Priority,
    RequestStatus Status,
    Guid? TaskId,
    string? RejectionReason,
    DateTimeOffset CreatedAt,
    string? AssigneeName,
    DateOnly? CommittedDueDate);

/// <summary>A brief in the studio's template (D50): job name, main goal, deliverables, marketing manager, deadline.</summary>
public sealed record CreateRequestRequest(
    Guid TeamId,
    [Required, MaxLength(200)] string Title,
    [MaxLength(2000)] string? MainGoal,
    [MaxLength(4000)] string? Deliverables,
    Guid DepartmentId,
    Guid MarketingManagerUserId,
    DateOnly? RequestedDueDate,
    Priority Priority);

/// <summary>Turns a request into a task: its project, who does it, the estimate and the committed due date.</summary>
public sealed record AcceptRequestRequest(
    Guid ProjectId,
    Guid? AssigneePersonId,
    [Range(0.0, 999.0)] decimal? EstimateHours,
    DateOnly? DueDate);

public sealed record RejectRequestRequest([Required, MaxLength(1000)] string Reason);
