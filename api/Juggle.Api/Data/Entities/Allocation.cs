namespace Juggle.Api.Data.Entities;

/// <summary>A booking: a person on a job for some days, at so many hours a day.</summary>
public class Allocation
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid PersonId { get; set; }
    public Guid JobId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal HoursPerDay { get; set; }
    public string? Notes { get; set; }

    public Person Person { get; set; } = null!;
    public Job Job { get; set; } = null!;
}
