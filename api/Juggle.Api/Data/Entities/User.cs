namespace Juggle.Api.Data.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public OrgRole OrgRole { get; set; }
    public required string AvatarColour { get; set; }

    public Person? Person { get; set; }
    public List<TeamMembership> Memberships { get; set; } = [];

    /// <summary>The brands this user manages, as their marketing manager (D58).</summary>
    public List<DepartmentManager> ManagedDepartments { get; set; } = [];
}
