using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Auth;

public sealed record DemoUserDto(
    Guid Id,
    string Name,
    string AvatarColour,
    string Role,
    string? JobTitle,
    string? Department,
    IReadOnlyList<string> Teams);

public sealed record SignInRequest(Guid UserId);

public sealed record MeDto(Guid Id, string Name, string Email, string AvatarColour, OrgRole OrgRole, Guid? PersonId);
