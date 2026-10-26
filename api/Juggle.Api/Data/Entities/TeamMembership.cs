namespace Juggle.Api.Data.Entities;

public class TeamMembership
{
    public Guid OrgId { get; set; }
    public Guid UserId { get; set; }
    public Guid TeamId { get; set; }
    public TeamRole Role { get; set; }

    public User User { get; set; } = null!;
    public Team Team { get; set; } = null!;
}
