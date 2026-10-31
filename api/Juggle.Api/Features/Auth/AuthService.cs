using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Auth;

public sealed class AuthService(JuggleDbContext db, CurrentUser currentUser, IDemoAuth demoAuth)
{
    // Nobody is signed in yet, so the org filter is bypassed. The demo has a single organisation.
    public async Task<IReadOnlyList<DemoUserDto>> GetDemoUsersAsync(CancellationToken ct)
    {
        var users = await db.Users.IgnoreQueryFilters()
            .Include(u => u.Person)
            .Include(u => u.Department)
            .Include(u => u.Memberships).ThenInclude(m => m.Team)
            .AsNoTracking()
            .ToListAsync(ct);

        return users
            .Select(u => new DemoUserDto(
                u.Id,
                u.Name,
                u.AvatarColour,
                RoleLabel(u),
                u.Person?.JobTitle,
                u.Department?.Name,
                u.Memberships.Select(m => m.Team.Name).Order().ToList()))
            .OrderBy(u => RoleRank(u.Role))
            .ThenBy(u => u.Name)
            .ToList();
    }

    public async Task SignInAsync(Guid userId, CancellationToken ct)
    {
        var user = await db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new NotFoundException("User not found.");
        await demoAuth.SignInAsync(user);
    }

    public Task SignOutAsync() => demoAuth.SignOutAsync();

    public async Task<MeDto> GetMeAsync(CancellationToken ct)
    {
        var me = await db.Users
            .Where(u => u.Id == currentUser.UserId)
            .Select(u => new { u.Id, u.Name, u.Email, u.AvatarColour, u.OrgRole, PersonId = u.Person == null ? (Guid?)null : u.Person.Id })
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("User not found.");
        var departmentLabel = await db.Organisations.Select(o => o.DepartmentLabel).FirstAsync(ct);
        return new MeDto(me.Id, me.Name, me.Email, me.AvatarColour, me.OrgRole, me.PersonId, departmentLabel);
    }

    private static string RoleLabel(User user) => user switch
    {
        { OrgRole: OrgRole.OrgAdmin } => "Org Admin",
        _ when user.Memberships.Any(m => m.Role == TeamRole.TeamAdmin) => "Team Admin",
        _ when user.Memberships.Count > 0 => "Member",
        _ => "Requester",
    };

    private static int RoleRank(string role) => role switch
    {
        "Org Admin" => 0,
        "Team Admin" => 1,
        "Member" => 2,
        _ => 3,
    };
}
