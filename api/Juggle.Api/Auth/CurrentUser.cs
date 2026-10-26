using System.Security.Claims;
using Juggle.Api.Data.Entities;

namespace Juggle.Api.Auth;

/// <summary>The signed-in user, read from the auth cookie's claims.</summary>
public sealed class CurrentUser(IHttpContextAccessor accessor)
{
    public const string OrgIdClaim = "org_id";
    public const string OrgRoleClaim = "org_role";

    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;

    public Guid UserId => Guid.Parse(Principal!.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public Guid OrgId => Guid.TryParse(Principal?.FindFirstValue(OrgIdClaim), out var id) ? id : Guid.Empty;

    public OrgRole OrgRole => Enum.Parse<OrgRole>(Principal!.FindFirstValue(OrgRoleClaim)!);

    public bool IsOrgAdmin => IsAuthenticated && OrgRole == OrgRole.OrgAdmin;
}
