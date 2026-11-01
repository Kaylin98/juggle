using System.Security.Claims;
using Juggle.Api.Data.Entities;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace Juggle.Api.Auth;

public sealed class CookieDemoAuth(IHttpContextAccessor accessor) : IDemoAuth
{
    private HttpContext Http => accessor.HttpContext!;

    public Task SignInAsync(User user)
    {
        Claim[] claims =
        [
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Name),
            new(CurrentUser.OrgIdClaim, user.OrgId.ToString()),
        ];
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        return Http.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));
    }

    public Task SignOutAsync() => Http.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
}
