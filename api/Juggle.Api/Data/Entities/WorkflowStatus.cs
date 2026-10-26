namespace Juggle.Api.Data.Entities;

public class WorkflowStatus
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid TeamId { get; set; }
    public required string Name { get; set; }
    public int Order { get; set; }
    public StatusCategory Category { get; set; }
}
