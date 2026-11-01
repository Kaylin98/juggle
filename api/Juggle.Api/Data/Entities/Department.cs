namespace Juggle.Api.Data.Entities;

public class Department
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public required string Name { get; set; }

    /// <summary>One of the 8 palette hues; its jobs and bookings take it (D61).</summary>
    public required string Colour { get; set; }

    /// <summary>Starts the job IDs of this department's jobs, such as "DJI" (D52).</summary>
    public string? JobCodePrefix { get; set; }

    /// <summary>
    /// The number of the brand's latest job (D71): it counts up when a brief is sent and never resets, so it starts from
    /// the brand's history.
    /// </summary>
    public int LastJobNumber { get; set; }
}
