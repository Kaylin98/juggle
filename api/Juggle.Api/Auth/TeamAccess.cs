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

    /// <summary>
    /// The people whose time off the viewer approves, and whose sick leave they may see: everyone for Org Admins,
    /// otherwise the people in the teams they admin.
    /// </summary>
    public IQueryable<Person> ManagedPeople() => currentUser.IsOrgAdmin
        ? db.People
        : db.People.Where(p => p.User.Memberships.Any(m => db.TeamMemberships.Any(a =>
            a.TeamId == m.TeamId && a.UserId == currentUser.UserId && a.Role == TeamRole.TeamAdmin)));

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
