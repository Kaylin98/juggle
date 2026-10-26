using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Auth;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(AuthService auth) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("demo-users")]
    public Task<IReadOnlyList<DemoUserDto>> GetDemoUsers(CancellationToken ct) => auth.GetDemoUsersAsync(ct);

    [AllowAnonymous]
    [HttpPost("sign-in")]
    public async Task<IActionResult> SignIn(SignInRequest request, CancellationToken ct)
    {
        await auth.SignInAsync(request.UserId, ct);
        return NoContent();
    }

    [AllowAnonymous]
    [HttpPost("sign-out")]
    public async Task<IActionResult> SignOutUser()
    {
        await auth.SignOutAsync();
        return NoContent();
    }

    [HttpGet("me")]
    public Task<MeDto> GetMe(CancellationToken ct) => auth.GetMeAsync(ct);
}
