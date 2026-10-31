using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Tasks;

public sealed class TasksService(JuggleDbContext db, TeamAccess teamAccess, CurrentUser currentUser, OrgClock clock)
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

    /// <summary>
    /// Adds a task to a board column (the first after Triage when none is given), at the end of it.
    /// Team Admins assign anyone in the team or no one; Members only themselves, so they can edit it afterwards (D24).
    /// </summary>
    public async Task<TaskDto> CreateAsync(Guid teamId, CreateTaskRequest request, CancellationToken ct)
    {
        var role = await teamAccess.GetRoleAsync(teamId, ct)
            ?? throw new ForbiddenException("You are not a member of this team.");
        var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == request.ProjectId && p.TeamId == teamId, ct)
            ?? throw new BadRequestException("Choose a project in this team.");

        // The first status, Triage, is for requests (D18), so it is not a board column.
        var columns = await db.WorkflowStatuses.Where(s => s.TeamId == teamId).OrderBy(s => s.Order).Skip(1).ToListAsync(ct);
        var status = request.StatusId is { } statusId
            ? columns.FirstOrDefault(s => s.Id == statusId) ?? throw new BadRequestException("Choose a board column in this team.")
            : columns[0];

        if (role == TeamRole.TeamAdmin)
        {
            await EnsureAssigneeInTeamAsync(request.AssigneePersonId, teamId, ct);
        }
        else if (request.AssigneePersonId is not { } personId
            || !await db.People.AnyAsync(p => p.Id == personId && p.UserId == currentUser.UserId, ct))
        {
            throw new ForbiddenException("Members can only add tasks assigned to themselves.");
        }

        var lastInColumn = await db.Tasks.Where(t => t.StatusId == status.Id).MaxAsync(t => (int?)t.SortOrder, ct);
        var task = new TaskItem
        {
            OrgId = project.OrgId,
            TeamId = teamId,
            ProjectId = project.Id,
            Title = request.Title.Trim(),
            Status = status,
            AssigneePersonId = request.AssigneePersonId,
            EstimateHours = request.EstimateHours,
            DueDate = request.DueDate,
            Link = request.Link,
            SortOrder = (lastInColumn ?? -1) + 1,
        };
        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);
        return ToDto(task);
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

        await EnsureAssigneeInTeamAsync(request.AssigneePersonId, task.TeamId, ct);

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

    private async Task EnsureAssigneeInTeamAsync(Guid? personId, Guid teamId, CancellationToken ct)
    {
        if (personId is { } id && !await db.People.AnyAsync(p => p.Id == id && p.User.Memberships.Any(m => m.TeamId == teamId), ct))
        {
            throw new BadRequestException("The assignee is not in this team.");
        }
    }

    private TaskDto ToDto(TaskItem task) => TaskDto.From(task, clock.Today);
}
