using System.ComponentModel.DataAnnotations;
using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Requests;

public sealed record OptionDto(Guid Id, string Name);

/// <summary>What the request form offers. Any team can be asked for work; the department defaults to the user's own.</summary>
public sealed record RequestOptionsDto(
    IReadOnlyList<OptionDto> Teams,
    IReadOnlyList<OptionDto> Departments,
    IReadOnlyList<RequestType> Types,
    IReadOnlyList<Priority> Priorities,
    Guid? MyDepartmentId);

public sealed record RequestDto(
    Guid Id,
    Guid TeamId,
    string TeamName,
    RequestType Type,
    string Title,
    string? Description,
    string Department,
    string RequesterName,
    DateOnly? RequestedDueDate,
    Priority Priority,
    RequestStatus Status,
    Guid? TaskId,
    string? RejectionReason,
    DateTimeOffset CreatedAt);

public sealed record CreateRequestRequest(
    Guid TeamId,
    RequestType Type,
    [Required, MaxLength(200)] string Title,
    [MaxLength(4000)] string? Description,
    Guid DepartmentId,
    DateOnly? RequestedDueDate,
    Priority Priority);

/// <summary>Turns a request into a task: its project, who does it, the estimate and the committed due date.</summary>
public sealed record AcceptRequestRequest(
    Guid ProjectId,
    Guid? AssigneePersonId,
    [Range(0.0, 999.0)] decimal? EstimateHours,
    DateOnly? DueDate);

public sealed record RejectRequestRequest([Required, MaxLength(1000)] string Reason);
