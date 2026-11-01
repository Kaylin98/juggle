using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Teams;

public sealed record TeamDto(Guid Id, string Name, string Colour, TeamRole MyRole);

public sealed record StatusDto(Guid Id, string Name, int Order, StatusCategory Category);

public sealed record ProjectDto(Guid Id, string Name, string Colour, Guid DepartmentId, string Department);

public sealed record PersonDto(Guid Id, string Name, string AvatarColour, string JobTitle, decimal HoursPerDay);
