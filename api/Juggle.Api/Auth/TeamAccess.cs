using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Auth;

/// <summary>Server-side team access checks. Org Admins act as Team Admin in every team.</summary>
public sealed class TeamAccess(JuggleDbContext db, CurrentUser currentUser)
{
    public async Task<TeamRole?> GetRoleAsync(Guid teamId, CancellationToken ct)
    {
        if (currentUser.IsOrgAdmin)
        {
            return await db.Teams.AnyAsync(t => t.Id == teamId, ct) ? TeamRole.TeamAdmin : null;
        }

        return await db.TeamMemberships
            .Where(m => m.TeamId == teamId && m.UserId == currentUser.UserId)
            .Select(m => (TeamRole?)m.Role)
            .FirstOrDefaultAsync(ct);
    }

    public async Task EnsureCanViewAsync(Guid teamId, CancellationToken ct)
    {
        if (await GetRoleAsync(teamId, ct) is null)
        {
            throw new ForbiddenException("You are not a member of this team.");
        }
    }

    public async Task EnsureCanManageAsync(Guid teamId, CancellationToken ct)
    {
        if (await GetRoleAsync(teamId, ct) != TeamRole.TeamAdmin)
        {
            throw new ForbiddenException("Only team admins can do this.");
        }
    }

    /// <summary>Team Admins edit any task in their team; Members only the tasks assigned to them.</summary>
    public async Task EnsureCanEditTaskAsync(TaskItem task, CancellationToken ct)
    {
        var role = await GetRoleAsync(task.TeamId, ct)
            ?? throw new ForbiddenException("You are not a member of this team.");
        if (role == TeamRole.TeamAdmin)
        {
            return;
        }

        var isAssignee = task.AssigneePersonId is { } assigneeId
            && await db.People.AnyAsync(p => p.Id == assigneeId && p.UserId == currentUser.UserId, ct);
        if (!isAssignee)
        {
            throw new ForbiddenException("You can only edit tasks assigned to you.");
        }
    }
}
