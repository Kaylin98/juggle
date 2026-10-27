using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Tasks;

public sealed class TasksService(JuggleDbContext db, TeamAccess teamAccess, OrgClock clock)
{
    public async Task<IReadOnlyList<TaskDto>> GetTeamTasksAsync(Guid teamId, CancellationToken ct)
    {
        await teamAccess.EnsureCanViewAsync(teamId, ct);
        var tasks = await db.Tasks
            .Include(t => t.Status)
            .Where(t => t.TeamId == teamId)
            .OrderBy(t => t.SortOrder)
            .AsNoTracking()
            .ToListAsync(ct);
        return tasks.Select(ToDto).ToList();
    }

    public async Task<TaskDto> UpdateAsync(Guid id, UpdateTaskRequest request, CancellationToken ct)
    {
        var task = await FindEditableAsync(id, ct);
        // D36: only Team Admins reassign. Planned to become a per-team setting after the MVP (plan.md, Later).
        if (request.AssigneePersonId != task.AssigneePersonId
            && await teamAccess.GetRoleAsync(task.TeamId, ct) != TeamRole.TeamAdmin)
        {
            throw new ForbiddenException("Only team admins can reassign tasks.");
        }

        if (request.AssigneePersonId is { } personId
            && !await db.People.AnyAsync(p => p.Id == personId && p.User.Memberships.Any(m => m.TeamId == task.TeamId), ct))
        {
            throw new BadRequestException("The assignee is not in this team.");
        }

        task.Title = request.Title.Trim();
        task.Description = request.Description;
        task.AssigneePersonId = request.AssigneePersonId;
        task.EstimateHours = request.EstimateHours;
        task.DueDate = request.DueDate;
        task.Link = request.Link;
        await db.SaveChangesAsync(ct);
        return ToDto(task);
    }

    /// <summary>
    /// Puts the task at the index within the target column and renumbers that column.
    /// Moving from a Review status to an In Progress status means it was sent back, so the review cycle goes up.
    /// </summary>
    public async Task<TaskDto> MoveAsync(Guid id, MoveTaskRequest request, CancellationToken ct)
    {
        var task = await FindEditableAsync(id, ct);
        var target = await db.WorkflowStatuses.FirstOrDefaultAsync(s => s.Id == request.StatusId && s.TeamId == task.TeamId, ct)
            ?? throw new BadRequestException("The status is not in this task's team.");

        if (task.Status.Category == StatusCategory.Review && target.Category == StatusCategory.InProgress)
        {
            task.ReviewCycle++;
        }
        task.Status = target;

        var column = await db.Tasks
            .Where(t => t.StatusId == target.Id && t.Id != task.Id)
            .OrderBy(t => t.SortOrder)
            .ToListAsync(ct);
        column.Insert(Math.Min(request.Index, column.Count), task);
        for (var i = 0; i < column.Count; i++)
        {
            column[i].SortOrder = i;
        }

        await db.SaveChangesAsync(ct);
        return ToDto(task);
    }

    private async Task<TaskItem> FindEditableAsync(Guid id, CancellationToken ct)
    {
        var task = await db.Tasks.Include(t => t.Status).FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new NotFoundException("Task not found.");
        await teamAccess.EnsureCanEditTaskAsync(task, ct);
        return task;
    }

    private TaskDto ToDto(TaskItem task) => new(
        task.Id,
        task.ProjectId,
        task.StatusId,
        task.Title,
        task.Description,
        task.AssigneePersonId,
        task.EstimateHours,
        task.DueDate,
        task.DueDate < clock.Today && task.Status.Category != StatusCategory.Done,
        task.ReviewCycle,
        task.SortOrder,
        task.Link);
}
