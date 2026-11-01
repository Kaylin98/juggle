using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Auth;

/// <param name="Role">The name of the user's role in their organisation (D77).</param>
/// <param name="Departments">The brands the user manages, by name (D58).</param>
public sealed record DemoUserDto(
    Guid Id,
    string Name,
    string AvatarColour,
    string Role,
    string? JobTitle,
    IReadOnlyList<string> Departments,
    IReadOnlyList<string> Teams);

public sealed record SignInRequest(Guid UserId);

/// <summary>The organisation's words for its concepts (D48, D77).</summary>
public sealed record TermsDto(string Department, string Brief, string Job);

/// <param name="Role">The name of the user's role in their organisation.</param>
/// <param name="Capabilities">What the role allows; the web shows pages and actions from these, never from the role's name (D77).</param>
/// <param name="ManagedDepartmentIds">The brands the user manages, whose cards they approve (D58).</param>
public sealed record MeDto(
    Guid Id,
    string Name,
    string Email,
    string AvatarColour,
    string Role,
    IReadOnlyList<Capability> Capabilities,
    Guid? PersonId,
    TermsDto Terms,
    IReadOnlyList<Guid> ManagedDepartmentIds);
