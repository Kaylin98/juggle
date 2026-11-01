using Juggle.Api.Auth;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Teams;

public sealed class TeamsService(JuggleDbContext db, CurrentUser currentUser, TeamAccess teamAccess, Permissions permissions)
{
    /// <summary>Teams the current user can open, by name: every team with ViewAllJobs, otherwise the teams they are in.</summary>
    public async Task<IReadOnlyList<TeamDto>> GetMyTeamsAsync(CancellationToken ct)
    {
        var teams = await permissions.HasAsync(Capability.ViewAllJobs, ct)
            ? db.Teams
            : db.Teams.Where(t => db.TeamMemberships.Any(m => m.TeamId == t.Id && m.UserId == currentUser.UserId));
        return await teams
            .OrderBy(t => t.Name)
            .Select(t => new TeamDto(t.Id, t.Name, t.Colour))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<StatusDto>> GetStatusesAsync(Guid teamId, CancellationToken ct)
    {
        await teamAccess.EnsureCanOpenAsync(teamId, ct);
        return await db.WorkflowStatuses
            .Where(s => s.TeamId == teamId)
            .OrderBy(s => s.Order)
            .Select(s => new StatusDto(s.Id, s.Name, s.Order, s.Category))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ProjectDto>> GetProjectsAsync(Guid teamId, CancellationToken ct)
    {
        await teamAccess.EnsureCanOpenAsync(teamId, ct);
        return await db.Projects
            .Where(p => p.TeamId == teamId)
            .OrderBy(p => p.Name)
            .Select(p => new ProjectDto(p.Id, p.Name, p.Department.Colour, p.DepartmentId, p.Department.Name))
            .ToListAsync(ct);
    }

    /// <summary>The team's people: every Person whose user is a member of the team.</summary>
    public async Task<IReadOnlyList<PersonDto>> GetPeopleAsync(Guid teamId, CancellationToken ct)
    {
        await teamAccess.EnsureCanOpenAsync(teamId, ct);
        return await db.People
            .Where(p => p.User.Memberships.Any(m => m.TeamId == teamId))
            .OrderBy(p => p.User.Name)
            .Select(p => new PersonDto(p.Id, p.User.Name, p.User.AvatarColour, p.JobTitle, p.HoursPerDay))
            .ToListAsync(ct);
    }
}
