namespace Juggle.Api.Data.Entities;

public class Allocation
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid PersonId { get; set; }
    public Guid ProjectId { get; set; }
    public Guid? TaskId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal HoursPerDay { get; set; }
    public string? Notes { get; set; }

    public Person Person { get; set; } = null!;
    public Project Project { get; set; } = null!;
}
