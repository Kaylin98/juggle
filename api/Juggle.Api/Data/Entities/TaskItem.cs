namespace Juggle.Api.Data.Entities;

public class TaskItem
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid TeamId { get; set; }
    public Guid ProjectId { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public Guid StatusId { get; set; }
    public Guid? AssigneePersonId { get; set; }
    public decimal? EstimateHours { get; set; }
    public DateOnly? DueDate { get; set; }
    public int ReviewCycle { get; set; } = 1;
    public int SortOrder { get; set; }
    public string? Link { get; set; }

    public Project Project { get; set; } = null!;
    public WorkflowStatus Status { get; set; } = null!;
    public Person? Assignee { get; set; }
}
