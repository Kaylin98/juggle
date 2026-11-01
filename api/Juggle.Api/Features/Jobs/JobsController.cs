using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Jobs;

[ApiController]
public sealed class JobsController(JobsService jobs) : ControllerBase
{
    [HttpGet("api/jobs/options")]
    public Task<JobOptionsDto> GetOptions(CancellationToken ct) => jobs.GetOptionsAsync(ct);

    [HttpPost("api/jobs")]
    public async Task<ActionResult<JobDetailDto>> Submit(CreateJobRequest request, CancellationToken ct)
    {
        var created = await jobs.SubmitAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { id = created.Job.Id }, created);
    }

    [HttpGet("api/jobs/mine")]
    public Task<IReadOnlyList<JobDto>> GetMine(CancellationToken ct) => jobs.GetMineAsync(ct);

    [HttpGet("api/jobs/{id:guid}")]
    public Task<JobDetailDto> Get(Guid id, CancellationToken ct) => jobs.GetAsync(id, ct);

    [HttpGet("api/teams/{teamId:guid}/jobs")]
    public Task<IReadOnlyList<JobDto>> GetTeamJobs(Guid teamId, CancellationToken ct) => jobs.GetTeamJobsAsync(teamId, ct);

    [HttpGet("api/teams/{teamId:guid}/incoming")]
    public Task<IReadOnlyList<JobDto>> GetIncoming(Guid teamId, CancellationToken ct) => jobs.GetIncomingAsync(teamId, ct);
}
