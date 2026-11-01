using System.ComponentModel.DataAnnotations;
using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Requests;

public sealed record OptionDto(Guid Id, string Name);

/// <summary>A team to ask, with its colour for the dot beside its name.</summary>
public sealed record TeamOptionDto(Guid Id, string Name, string Colour);

/// <summary>
/// What the request form offers. Any team can be asked for work; the department defaults to the first brand the user
/// manages (D58).
/// </summary>
public sealed record RequestOptionsDto(
    IReadOnlyList<TeamOptionDto> Teams,
    IReadOnlyList<OptionDto> Departments,
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
    DateOnly? RequestedDueDate,
    Priority Priority,
    RequestStatus Status,
    Guid? TaskId,
    string? RejectionReason,
    DateTimeOffset CreatedAt,
    string? AssigneeName,
    DateOnly? CommittedDueDate);

/// <summary>
/// A brief in the studio's template (D50): job name, main goal, deliverables, deadline. The signed-in user sends it
/// (D58).
/// </summary>
public sealed record CreateRequestRequest(
    Guid TeamId,
    [Required, MaxLength(200)] string Title,
    [MaxLength(2000)] string? MainGoal,
    [MaxLength(4000)] string? Deliverables,
    Guid DepartmentId,
    DateOnly? RequestedDueDate,
    Priority Priority);

/// <summary>
/// Turns a request into work, with who does it, the estimate and the committed due date. Either into an existing
/// project (one task), or as a new brief: a project named <paramref name="NewProjectName"/> with one task per
/// deliverable (D51).
/// </summary>
public sealed record AcceptRequestRequest(
    Guid? ProjectId,
    [MaxLength(200)] string? NewProjectName,
    Guid? AssigneePersonId,
    [Range(0.0, 999.0)] decimal? EstimateHours,
    DateOnly? DueDate);

/// <summary>
/// What accepting as a new brief proposes (D51): the next job code, or null when the department has no job code prefix,
/// and the colour the project will take.
/// </summary>
public sealed record NewBriefDto(string? ProjectName, string Colour);

public sealed record RejectRequestRequest([Required, MaxLength(1000)] string Reason);
