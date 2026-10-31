namespace Juggle.Api.Data.Entities;

public class Department
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public required string Name { get; set; }

    /// <summary>Starts the job codes of this department's projects, such as "DJI" (D52).</summary>
    public string? JobCodePrefix { get; set; }
}
