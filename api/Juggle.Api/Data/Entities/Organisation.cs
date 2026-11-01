namespace Juggle.Api.Data.Entities;

/// <summary>An organisation and its settings; Juggle is configured per organisation (D77).</summary>
public class Organisation
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public required string Name { get; set; }
    public required string TimeZone { get; set; }

    /// <summary>What users see for the department concept, such as "Brand" (D48).</summary>
    public string DepartmentLabel { get; set; } = "Department";

    /// <summary>What users see for a request for work, such as "Brief".</summary>
    public string BriefLabel { get; set; } = "Request";

    /// <summary>What users see for a piece of work, such as "Job".</summary>
    public string JobLabel { get; set; } = "Job";

    /// <summary>The month (1 to 12) the financial year starts in, for job code quarters (D52).</summary>
    public int FinancialYearStartMonth { get; set; } = 3;

    /// <summary>A working day's hours for someone new to the schedule.</summary>
    public decimal WorkdayHours { get; set; } = 8;

    /// <summary>Whose public holidays the calendar has, as an ISO 3166 code such as "ZA".</summary>
    public string HolidayCountry { get; set; } = "ZA";
}
