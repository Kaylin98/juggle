namespace Juggle.Api.Data.Entities;

public class Department
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public required string Name { get; set; }
}
