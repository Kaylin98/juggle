namespace Juggle.Api.Data.Entities;

public class Team
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public required string Name { get; set; }
    public required string Colour { get; set; }

    public List<TeamMembership> Memberships { get; set; } = [];
}
