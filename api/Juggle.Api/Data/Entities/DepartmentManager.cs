namespace Juggle.Api.Data.Entities;

/// <summary>A user who manages a brand (department), such as its marketing manager. One user can manage several (D58).</summary>
public class DepartmentManager
{
    public Guid OrgId { get; set; }
    public Guid UserId { get; set; }
    public Guid DepartmentId { get; set; }

    public User User { get; set; } = null!;
    public Department Department { get; set; } = null!;
}
