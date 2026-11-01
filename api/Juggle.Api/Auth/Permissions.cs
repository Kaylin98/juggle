using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Auth;

/// <summary>
/// What the signed-in user may do: their role's capabilities in their organisation (D77), read once per request, so a
/// change to the role applies on the next request.
/// </summary>
public sealed class Permissions(JuggleDbContext db, CurrentUser currentUser)
{
    private IReadOnlySet<Capability>? capabilities;

    public async Task<IReadOnlySet<Capability>> GetAsync(CancellationToken ct) =>
        capabilities ??= (await db.Users
            .Where(u => u.Id == currentUser.UserId)
            .Select(u => u.Role.Capabilities)
            .FirstOrDefaultAsync(ct) ?? [])
            .ToHashSet();

    public async Task<bool> HasAsync(Capability capability, CancellationToken ct) => (await GetAsync(ct)).Contains(capability);

    public async Task EnsureAsync(Capability capability, CancellationToken ct)
    {
        if (!await HasAsync(capability, ct))
        {
            throw new ForbiddenException("Your role does not allow this.");
        }
    }
}
