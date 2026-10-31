using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Reports;

[ApiController]
public sealed class ReportsController(BriefsReportService briefs) : ControllerBase
{
    /// <summary>For one brand (department) when departmentId is given, otherwise for every brand.</summary>
    [HttpGet("api/teams/{teamId:guid}/reports/briefs")]
    public Task<BriefsReportDto> GetBriefs(Guid teamId, [FromQuery] Guid? departmentId, CancellationToken ct) =>
        briefs.GetAsync(teamId, departmentId, ct);
}
