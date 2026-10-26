namespace Juggle.Api.Data.Entities;

public class Person
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrgId { get; set; }
    public Guid UserId { get; set; }
    public required string JobTitle { get; set; }
    public List<string> Skills { get; set; } = [];
    public decimal HoursPerDay { get; set; }

    public User User { get; set; } = null!;
}
