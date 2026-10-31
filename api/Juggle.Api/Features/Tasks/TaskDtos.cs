using System.ComponentModel.DataAnnotations;
using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Tasks;

public sealed record TaskDto(
    Guid Id,
    Guid ProjectId,
    Guid StatusId,
    string Title,
    string? Description,
    Guid? AssigneePersonId,
    decimal? EstimateHours,
    DateOnly? DueDate,
    bool IsOverdue,
    int ReviewCycle,
    int SortOrder,
    string? Link)
{
    /// <summary>Maps a task loaded with its status. Overdue (D21): due before today and not done.</summary>
    public static TaskDto From(TaskItem task, DateOnly today) => new(
        task.Id,
        task.ProjectId,
        task.StatusId,
        task.Title,
        task.Description,
        task.AssigneePersonId,
        task.EstimateHours,
        task.DueDate,
        task.DueDate < today && task.Status.Category != StatusCategory.Done,
        task.ReviewCycle,
        task.SortOrder,
        task.Link);
}

/// <summary>A task added from the board. With no status it goes in the first column after Triage.</summary>
public sealed record CreateTaskRequest(
    [Required, MaxLength(200)] string Title,
    Guid ProjectId,
    Guid? StatusId,
    Guid? AssigneePersonId,
    [Range(0.0, 999.0)] decimal? EstimateHours,
    DateOnly? DueDate,
    [MaxLength(1000), Url] string? Link);

public sealed record UpdateTaskRequest(
    [Required, MaxLength(200)] string Title,
    [MaxLength(4000)] string? Description,
    Guid? AssigneePersonId,
    [Range(0.0, 999.0)] decimal? EstimateHours,
    DateOnly? DueDate,
    [MaxLength(1000), Url] string? Link);

/// <summary>Moves a task to a status, at a position (0-based) within that status's column.</summary>
public sealed record MoveTaskRequest(Guid StatusId, [Range(0, int.MaxValue)] int Index);
