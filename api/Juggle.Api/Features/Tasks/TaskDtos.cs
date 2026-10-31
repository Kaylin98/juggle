using System.ComponentModel.DataAnnotations;
using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Tasks;

/// <param name="IsDueSoon">Due within the next 7 days, or overdue, and not done (D57).</param>
/// <param name="BookedHours">The hours of all its bookings.</param>
/// <param name="Bookings">The bookings linked to it, earliest first.</param>
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
    bool IsDueSoon,
    int ReviewCycle,
    int SortOrder,
    string? Link,
    decimal BookedHours,
    IReadOnlyList<TaskBookingDto> Bookings)
{
    private const int DueSoonDays = 7;

    /// <summary>Maps a task loaded with its status. Overdue (D21): due before today and not done.</summary>
    public static TaskDto From(TaskItem task, DateOnly today, IEnumerable<TaskBookingDto> bookings)
    {
        var open = task.Status.Category != StatusCategory.Done;
        var linked = bookings.ToList();
        return new(
            task.Id,
            task.ProjectId,
            task.StatusId,
            task.Title,
            task.Description,
            task.AssigneePersonId,
            task.EstimateHours,
            task.DueDate,
            open && task.DueDate < today,
            open && task.DueDate <= today.AddDays(DueSoonDays),
            task.ReviewCycle,
            task.SortOrder,
            task.Link,
            linked.Sum(b => b.Hours),
            linked);
    }
}

/// <param name="Hours">Hours per day on each of the person's working days from the start to the end date.</param>
public sealed record TaskBookingDto(Guid PersonId, string PersonName, DateOnly StartDate, DateOnly EndDate, decimal HoursPerDay, decimal Hours);

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
