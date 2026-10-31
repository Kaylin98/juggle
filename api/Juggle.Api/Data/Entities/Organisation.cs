namespace Juggle.Api.Data.Entities;

public class Organisation
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Name { get; set; }
    public required string TimeZone { get; set; }

    /// <summary>What users see for the department concept, such as "Brand" (D48).</summary>
    public string DepartmentLabel { get; set; } = "Department";

    /// <summary>The month (1 to 12) the financial year starts in, for job code quarters (D52).</summary>
    public int FinancialYearStartMonth { get; set; } = 3;
}
