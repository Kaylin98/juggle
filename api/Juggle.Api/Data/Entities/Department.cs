namespace Juggle.Api.Data.Entities;

public class Department
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public required string Name { get; set; }

    /// <summary>One of the 8 palette hues; its tasks and bookings take it (D61).</summary>
    public required string Colour { get; set; }

    /// <summary>Starts the job codes of this department's projects, such as "DJI" (D52).</summary>
    public string? JobCodePrefix { get; set; }
}
