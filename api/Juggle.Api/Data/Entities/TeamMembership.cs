namespace Juggle.Api.Data.Entities;

/// <summary>A user in a team, such as a designer on the studio's schedule. What they may do comes from their role (D77).</summary>
public class TeamMembership
{
    public Guid OrgId { get; set; }
    public Guid UserId { get; set; }
    public Guid TeamId { get; set; }

    public User User { get; set; } = null!;
    public Team Team { get; set; } = null!;
}
