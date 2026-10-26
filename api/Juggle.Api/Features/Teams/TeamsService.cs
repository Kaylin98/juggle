using Juggle.Api.Auth;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Teams;

public sealed class TeamsService(JuggleDbContext db, CurrentUser currentUser)
{
    /// <summary>Teams the current user can open. Org Admins see every team as Team Admin.</summary>
    public async Task<IReadOnlyList<TeamDto>> GetMyTeamsAsync(CancellationToken ct)
    {
        if (currentUser.IsOrgAdmin)
        {
            return await db.Teams
                .OrderBy(t => t.Name)
                .Select(t => new TeamDto(t.Id, t.Name, t.Colour, TeamRole.TeamAdmin))
                .ToListAsync(ct);
        }

        return await db.TeamMemberships
            .Where(m => m.UserId == currentUser.UserId)
            .OrderBy(m => m.Team.Name)
            .Select(m => new TeamDto(m.Team.Id, m.Team.Name, m.Team.Colour, m.Role))
            .ToListAsync(ct);
    }
}
