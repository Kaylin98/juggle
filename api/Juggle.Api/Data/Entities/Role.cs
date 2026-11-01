namespace Juggle.Api.Data.Entities;

/// <summary>One of an organisation's roles, such as The Core Group's Traffic Manager, and what it may do (D77).</summary>
public class Role
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public required string Name { get; set; }

    /// <summary>Where the role comes in lists, such as the login screen.</summary>
    public int Order { get; set; }

    public List<Capability> Capabilities { get; set; } = [];
}
