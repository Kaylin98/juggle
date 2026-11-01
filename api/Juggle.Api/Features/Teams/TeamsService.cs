using Juggle.Api.Auth;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Teams;

public sealed class TeamsService(JuggleDbContext db, CurrentUser currentUser, TeamAccess teamAccess)
{
    /// <summary>
    /// Teams the current user can open, by name. Org Admins see every team as Team Admin, their own teams first, so
    /// they land on their own team.
    /// </summary>
    public async Task<IReadOnlyList<TeamDto>> GetMyTeamsAsync(CancellationToken ct)
    {
        if (currentUser.IsOrgAdmin)
        {
            return await db.Teams
                .OrderBy(t => !db.TeamMemberships.Any(m => m.TeamId == t.Id && m.UserId == currentUser.UserId))
                .ThenBy(t => t.Name)
                .Select(t => new TeamDto(t.Id, t.Name, t.Colour, TeamRole.TeamAdmin))
                .ToListAsync(ct);
        }

        return await db.TeamMemberships
            .Where(m => m.UserId == currentUser.UserId)
            .OrderBy(m => m.Team.Name)
            .Select(m => new TeamDto(m.Team.Id, m.Team.Name, m.Team.Colour, m.Role))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<StatusDto>> GetStatusesAsync(Guid teamId, CancellationToken ct)
    {
        await teamAccess.EnsureCanViewAsync(teamId, ct);
        return await db.WorkflowStatuses
            .Where(s => s.TeamId == teamId)
            .OrderBy(s => s.Order)
            .Select(s => new StatusDto(s.Id, s.Name, s.Order, s.Category))
            .ToListAsync(ct);
    }

    /// <summary>The team's projects; a brand's marketing manager gets only the brands they manage, as on the board (D58).</summary>
    public async Task<IReadOnlyList<ProjectDto>> GetProjectsAsync(Guid teamId, CancellationToken ct)
    {
        var departments = await teamAccess.VisibleDepartmentsAsync(teamId, ct);
        var query = db.Projects.Where(p => p.TeamId == teamId);
        if (departments is not null)
        {
            query = query.Where(p => departments.Contains(p.DepartmentId));
        }

        return await query
            .OrderBy(p => p.Name)
            .Select(p => new ProjectDto(p.Id, p.Name, p.Colour, p.DepartmentId, p.Department.Name))
            .ToListAsync(ct);
    }

    /// <summary>The team's people: every Person whose user is a member of the team.</summary>
    public async Task<IReadOnlyList<PersonDto>> GetPeopleAsync(Guid teamId, CancellationToken ct)
    {
        await teamAccess.EnsureCanViewAsync(teamId, ct);
        return await db.People
            .Where(p => p.User.Memberships.Any(m => m.TeamId == teamId))
            .OrderBy(p => p.User.Name)
            .Select(p => new PersonDto(p.Id, p.User.Name, p.User.AvatarColour, p.JobTitle, p.HoursPerDay))
            .ToListAsync(ct);
    }
}
