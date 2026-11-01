using System.Security.Claims;

namespace Juggle.Api.Auth;

/// <summary>The signed-in user, read from the auth cookie's claims. What they may do is in <see cref="Permissions"/>.</summary>
public sealed class CurrentUser(IHttpContextAccessor accessor)
{
    public const string OrgIdClaim = "org_id";

    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;

    public Guid UserId => Guid.Parse(Principal!.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public Guid OrgId => Guid.TryParse(Principal?.FindFirstValue(OrgIdClaim), out var id) ? id : Guid.Empty;
}
