using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Auth;

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

/// <param name="DepartmentLabel">What the organisation calls departments, such as "Brand" (D48).</param>
/// <param name="ManagedDepartmentIds">The brands the user manages, whose cards they approve (D58).</param>
public sealed record MeDto(
    Guid Id,
    string Name,
    string Email,
    string AvatarColour,
    OrgRole OrgRole,
    Guid? PersonId,
    string DepartmentLabel,
    IReadOnlyList<Guid> ManagedDepartmentIds);
