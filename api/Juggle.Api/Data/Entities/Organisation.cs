namespace Juggle.Api.Data.Entities;

public class Organisation
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Name { get; set; }
    public required string TimeZone { get; set; }
}
