namespace Juggle.Api.Data.Entities;

/// <summary>Leave for one person, or a public holiday when PersonId is null.</summary>
public class TimeOff
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid? PersonId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public TimeOffType Type { get; set; }
    public TimeOffStatus Status { get; set; }
    public string? Description { get; set; }
}
