using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Teams;

public sealed record TeamDto(Guid Id, string Name, string Colour, TeamRole MyRole);
