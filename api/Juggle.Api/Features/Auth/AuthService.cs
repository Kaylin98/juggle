using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Auth;

public sealed class AuthService(JuggleDbContext db, CurrentUser currentUser, IDemoAuth demoAuth)
{
    /// <summary>
    /// Everyone who can sign in, in their role's order, then by name. Nobody is signed in yet, so the org filter is
    /// bypassed: the demo login list is admin tooling, the one place that reads across organisations (D77).
    /// </summary>
    public async Task<IReadOnlyList<DemoUserDto>> GetDemoUsersAsync(CancellationToken ct)
    {
        var users = await db.Users.IgnoreQueryFilters()
            .Include(u => u.Role)
            .Include(u => u.Person)
            .Include(u => u.ManagedDepartments).ThenInclude(m => m.Department)
            .Include(u => u.Memberships).ThenInclude(m => m.Team)
            .OrderBy(u => u.Role.Order)
            .ThenBy(u => u.Name)
            .AsNoTracking()
            .ToListAsync(ct);

        return users
            .Select(u => new DemoUserDto(
                u.Id,
                u.Name,
                u.AvatarColour,
                u.Role.Name,
                u.Person?.JobTitle,
                u.ManagedDepartments.Select(m => m.Department.Name).Order().ToList(),
                u.Memberships.Select(m => m.Team.Name).Order().ToList()))
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
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Email,
                u.AvatarColour,
                Role = u.Role.Name,
                u.Role.Capabilities,
                PersonId = u.Person == null ? (Guid?)null : u.Person.Id,
                ManagedDepartmentIds = u.ManagedDepartments.Select(m => m.DepartmentId).ToList(),
            })
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("User not found.");
        var terms = await db.Organisations.Select(o => new TermsDto(o.DepartmentLabel, o.BriefLabel, o.JobLabel)).FirstAsync(ct);
        return new MeDto(me.Id, me.Name, me.Email, me.AvatarColour, me.Role, me.Capabilities, me.PersonId, terms, me.ManagedDepartmentIds);
    }
}
