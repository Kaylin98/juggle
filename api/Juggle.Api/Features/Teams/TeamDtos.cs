namespace Juggle.Api.Features.Teams;

public sealed record TeamDto(Guid Id, string Name, string Colour);

public sealed record PersonDto(Guid Id, string Name, string AvatarColour, string JobTitle, decimal HoursPerDay);
