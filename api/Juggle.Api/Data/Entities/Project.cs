namespace Juggle.Api.Data.Entities;

public class Project
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid TeamId { get; set; }
    public Guid DepartmentId { get; set; }
    public required string Name { get; set; }
    public required string Colour { get; set; }
    public DateOnly? DueDate { get; set; }

    public Department Department { get; set; } = null!;
}
