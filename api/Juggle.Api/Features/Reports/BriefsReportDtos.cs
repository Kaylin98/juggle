namespace Juggle.Api.Features.Reports;

/// <param name="Brands">The brands with jobs in the team, for the brand filter; never filtered.</param>
/// <param name="ByColumn">Jobs per board column, in board order. Cancelled jobs are left out (D75).</param>
/// <param name="ByDesigner">Jobs per designer and column: everyone in the team, most open jobs first, then jobs with no designer.</param>
/// <param name="ReceivedByMonth">Briefs sent to the team per calendar month, oldest first, ending with this month.</param>
public sealed record BriefsReportDto(
    IReadOnlyList<BrandDto> Brands,
    IReadOnlyList<ColumnCountDto> ByColumn,
    IReadOnlyList<DesignerCountDto> ByDesigner,
    IReadOnlyList<MonthCountDto> ReceivedByMonth);

public sealed record BrandDto(Guid Id, string Name);

/// <param name="Done">Every status in the column is done or cancelled, so its jobs count as completed.</param>
public sealed record ColumnCountDto(Guid ColumnId, string Name, bool Done, int Count);

/// <param name="PersonId">Null for the jobs with no designer yet.</param>
/// <param name="Counts">Jobs per column id; columns with none are left out.</param>
public sealed record DesignerCountDto(Guid? PersonId, string? Name, IReadOnlyDictionary<Guid, int> Counts);

/// <param name="Month">The first day of the month.</param>
public sealed record MonthCountDto(DateOnly Month, int Count);
