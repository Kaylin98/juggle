namespace Juggle.Api.Data.Entities;

public class Request
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid TeamId { get; set; }
    public Guid RequesterUserId { get; set; }
    public Guid DepartmentId { get; set; }
    public RequestType Type { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateOnly? RequestedDueDate { get; set; }
    public Priority Priority { get; set; }
    public RequestStatus Status { get; set; }
    public Guid? TaskId { get; set; }
    public string? RejectionReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Team Team { get; set; } = null!;
    public User Requester { get; set; } = null!;
    public Department Department { get; set; } = null!;
}
