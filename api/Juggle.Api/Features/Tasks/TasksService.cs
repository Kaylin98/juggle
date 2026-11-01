using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Tasks;

public sealed class TasksService(JuggleDbContext db, TeamAccess teamAccess, CurrentUser currentUser, OrgClock clock)
{
    /// <summary>The team's cards; a brand's marketing manager gets only the cards of the brands they manage (D58).</summary>
    public async Task<IReadOnlyList<TaskDto>> GetTeamTasksAsync(Guid teamId, CancellationToken ct)
    {
        var departments = await teamAccess.VisibleDepartmentsAsync(teamId, ct);
        var query = db.Tasks.Include(t => t.Status).Where(t => t.TeamId == teamId);
        if (departments is not null)
        {
            query = query.Where(t => departments.Contains(t.Project.DepartmentId));
        }

        var tasks = await query
            .OrderBy(t => t.SortOrder)
            .AsNoTracking()
            .ToListAsync(ct);
        var bookings = await TaskBookings.LoadAsync(db, tasks.Select(t => t.Id).ToList(), ct);
        return tasks.Select(t => TaskDto.From(t, clock.Today, bookings[t.Id])).ToList();
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
        return await ToDtoAsync(task, ct);
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
        return await ToDtoAsync(task, ct);
    }

    public async Task<TaskDto> MoveAsync(Guid id, MoveTaskRequest request, CancellationToken ct)
    {
        var task = await FindEditableAsync(id, ct);
        var target = await db.WorkflowStatuses.FirstOrDefaultAsync(s => s.Id == request.StatusId && s.TeamId == task.TeamId, ct)
            ?? throw new BadRequestException("The status is not in this task's team.");

        await MoveToAsync(task, target, request.Index, ct);
        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(task, ct);
    }

    /// <summary>The brand's manager approves a card awaiting approval: it goes to the top of the first Done column (D58).</summary>
    public async Task<TaskDto> ApproveAsync(Guid id, CancellationToken ct)
    {
        var (task, statuses) = await FindAwaitingApprovalAsync(id, ct);
        task.Feedback = null;
        await MoveToAsync(task, statuses.First(s => s.Category == StatusCategory.Done), 0, ct);
        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(task, ct);
    }

    /// <summary>
    /// The brand's manager sends a card awaiting approval back to the top of the first review column (Feedback needed),
    /// with what to change; leaving the approval column for it raises the review round (D58).
    /// </summary>
    public async Task<TaskDto> RequestChangesAsync(Guid id, RequestChangesRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Comment))
        {
            throw new BadRequestException("Say what needs to change.");
        }

        var (task, statuses) = await FindAwaitingApprovalAsync(id, ct);
        task.Feedback = request.Comment.Trim();
        await MoveToAsync(task, statuses.First(s => s.Category == StatusCategory.Review), 0, ct);
        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(task, ct);
    }

    /// <summary>
    /// Puts the task at the index within the target column and renumbers that column. Leaving the approval column (the
    /// last Review status) for an earlier Review or In Progress status means it was sent back, so the review round goes
    /// up (D58, replacing D20's Review to In Progress rule, so Feedback needed to Working on it does not count twice).
    /// </summary>
    private async Task MoveToAsync(TaskItem task, WorkflowStatus target, int index, CancellationToken ct)
    {
        var approval = await db.WorkflowStatuses
            .Where(s => s.TeamId == task.TeamId && s.Category == StatusCategory.Review)
            .OrderByDescending(s => s.Order)
            .FirstOrDefaultAsync(ct);
        if (task.Status.Id == approval?.Id
            && target.Order < approval.Order
            && target.Category is StatusCategory.Review or StatusCategory.InProgress)
        {
            task.ReviewCycle++;
        }
        task.Status = target;

        var column = await db.Tasks
            .Where(t => t.StatusId == target.Id && t.Id != task.Id)
            .OrderBy(t => t.SortOrder)
            .ToListAsync(ct);
        column.Insert(Math.Min(index, column.Count), task);
        for (var i = 0; i < column.Count; i++)
        {
            column[i].SortOrder = i;
        }
    }

    /// <summary>
    /// A card in its team's approval column (the last of two or more Review statuses, Awaiting approval for the Studio),
    /// for a manager of its brand, with the team's statuses in order.
    /// </summary>
    private async Task<(TaskItem Task, List<WorkflowStatus> Statuses)> FindAwaitingApprovalAsync(Guid id, CancellationToken ct)
    {
        var task = await db.Tasks.Include(t => t.Status).Include(t => t.Project).FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new NotFoundException("Task not found.");
        if (!await db.DepartmentManagers.AnyAsync(m => m.UserId == currentUser.UserId && m.DepartmentId == task.Project.DepartmentId, ct))
        {
            var label = await db.Organisations.Select(o => o.DepartmentLabel).FirstAsync(ct);
            throw new ForbiddenException($"Only the {label.ToLowerInvariant()}'s manager can approve this.");
        }

        var statuses = await db.WorkflowStatuses.Where(s => s.TeamId == task.TeamId).OrderBy(s => s.Order).ToListAsync(ct);
        var review = statuses.Where(s => s.Category == StatusCategory.Review).ToList();
        if (review.Count < 2 || task.StatusId != review[^1].Id)
        {
            throw new BadRequestException("This card is not awaiting approval.");
        }
        return (task, statuses);
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

    private async Task<TaskDto> ToDtoAsync(TaskItem task, CancellationToken ct) =>
        TaskDto.From(task, clock.Today, (await TaskBookings.LoadAsync(db, [task.Id], ct))[task.Id]);
}
