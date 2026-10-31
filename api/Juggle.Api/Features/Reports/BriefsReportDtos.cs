using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Reports;

/// <param name="Brands">The brands with projects in the team or requests to it, for the brand filter; never filtered.</param>
/// <param name="ByStatus">Cards per board column (Triage left out, D18), in board order.</param>
/// <param name="ByDesigner">Cards per assignee and column: everyone in the team, most open cards first, then unassigned cards.</param>
/// <param name="ReceivedByMonth">Requests sent to the team per calendar month, oldest first, ending with this month.</param>
public sealed record BriefsReportDto(
    IReadOnlyList<BrandDto> Brands,
    IReadOnlyList<StatusCountDto> ByStatus,
    IReadOnlyList<DesignerCountDto> ByDesigner,
    IReadOnlyList<MonthCountDto> ReceivedByMonth);

public sealed record BrandDto(Guid Id, string Name);

public sealed record StatusCountDto(Guid StatusId, string Name, StatusCategory Category, int Count);

/// <param name="PersonId">Null for the cards nobody is assigned to.</param>
/// <param name="Counts">Cards per status id; statuses with none are left out.</param>
public sealed record DesignerCountDto(Guid? PersonId, string? Name, IReadOnlyDictionary<Guid, int> Counts);

/// <param name="Month">The first day of the month.</param>
public sealed record MonthCountDto(DateOnly Month, int Count);
