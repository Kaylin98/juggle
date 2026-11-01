using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Auth;

/// <summary>
/// Server-side team access checks, by the user's capabilities (D77), never by role name. With ViewAllJobs a user can
/// open every team; otherwise only the teams they are in.
/// </summary>
public sealed class TeamAccess(JuggleDbContext db, CurrentUser currentUser, Permissions permissions)
{
    /// <summary>The team exists and the user may open it: every team with ViewAllJobs, otherwise their own.</summary>
    public async Task<bool> CanOpenAsync(Guid teamId, CancellationToken ct) => await permissions.HasAsync(Capability.ViewAllJobs, ct)
        ? await db.Teams.AnyAsync(t => t.Id == teamId, ct)
        : await db.TeamMemberships.AnyAsync(m => m.TeamId == teamId && m.UserId == currentUser.UserId, ct);

    public async Task EnsureCanOpenAsync(Guid teamId, CancellationToken ct)
    {
        if (!await CanOpenAsync(teamId, ct))
        {
            throw new ForbiddenException("You are not a member of this team.");
        }
    }

    /// <summary>The user has the capability and may open the team.</summary>
    public async Task EnsureAsync(Guid teamId, Capability capability, CancellationToken ct)
    {
        await permissions.EnsureAsync(capability, ct);
        await EnsureCanOpenAsync(teamId, ct);
    }

    /// <summary>
    /// The people whose time off the viewer approves, and whose sick leave they may see: with ApproveTimeOff, everyone
    /// in the teams they can open; otherwise no one.
    /// </summary>
    public async Task<IQueryable<Person>> ManagedPeopleAsync(CancellationToken ct)
    {
        if (!await permissions.HasAsync(Capability.ApproveTimeOff, ct))
        {
            return db.People.Where(_ => false);
        }

        return await permissions.HasAsync(Capability.ViewAllJobs, ct)
            ? db.People
            : db.People.Where(p => p.User.Memberships.Any(m => db.TeamMemberships.Any(a => a.TeamId == m.TeamId && a.UserId == currentUser.UserId)));
    }
}
