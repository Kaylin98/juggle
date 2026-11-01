using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Workflow;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Jobs;

/// <summary>
/// Jobs (D68): users who brief work (SubmitBrief) send a brief, which becomes a job with its job ID in the first
/// status of the organisation's workflow. Who sees a job is <see cref="JobAccess"/>'s rule.
/// </summary>
public sealed class JobsService(
    JuggleDbContext db,
    CurrentUser currentUser,
    Permissions permissions,
    TeamAccess teamAccess,
    JobAccess jobAccess,
    JobWorkflow workflow,
    OrgClock clock)
{
    public async Task<JobOptionsDto> GetOptionsAsync(CancellationToken ct)
    {
        var teams = await db.Teams.OrderBy(t => t.Name).Select(t => new TeamOptionDto(t.Id, t.Name, t.Colour)).ToListAsync(ct);
        var departments = await db.Departments.OrderBy(d => d.Name).Select(d => new OptionDto(d.Id, d.Name)).ToListAsync(ct);
        var myDepartmentId = await db.DepartmentManagers
            .Where(m => m.UserId == currentUser.UserId)
            .OrderBy(m => m.Department.Name)
            .Select(m => (Guid?)m.DepartmentId)
            .FirstOrDefaultAsync(ct);
        return new JobOptionsDto(teams, departments, Enum.GetValues<Priority>(), myDepartmentId);
    }

    /// <summary>
    /// Sends a brief: the job gets its job ID at once (D63), from the brand's next number and the quarter of the
    /// required date (today without one), and starts where the organisation's Submit step leads.
    /// </summary>
    public async Task<JobDto> SubmitAsync(CreateJobRequest request, CancellationToken ct)
    {
        await permissions.EnsureAsync(Capability.SubmitBrief, ct);
        if (!await db.Teams.AnyAsync(t => t.Id == request.TeamId, ct))
        {
            throw new BadRequestException("Choose a team.");
        }
        var organisation = await db.Organisations.FirstAsync(ct);
        var department = await db.Departments.FirstOrDefaultAsync(d => d.Id == request.DepartmentId, ct)
            ?? throw new BadRequestException($"Choose a {organisation.DepartmentLabel.ToLowerInvariant()}.");
        if (Deliverables.Parse(request.Deliverables).Any(d => d.Length > Deliverables.MaxLength))
        {
            throw new BadRequestException($"Keep each deliverable under {Deliverables.MaxLength} characters.");
        }
        if (request.RequiredDate < clock.Today)
        {
            throw new BadRequestException("The deadline can't be in the past.");
        }

        var prefix = department.JobCodePrefix ?? "";
        var codes = await db.Jobs.Where(j => j.DepartmentId == department.Id).Select(j => j.Code).ToListAsync(ct);
        var title = request.Title.Trim();
        var job = new Job
        {
            OrgId = currentUser.OrgId,
            TeamId = request.TeamId,
            DepartmentId = department.Id,
            RequesterUserId = currentUser.UserId,
            Code = JobCodes.Name(prefix, JobCodes.NextNumber(prefix, codes), request.RequiredDate ?? clock.Today, organisation.FinancialYearStartMonth, title),
            Title = title,
            MainGoal = string.IsNullOrWhiteSpace(request.MainGoal) ? null : request.MainGoal.Trim(),
            Deliverables = string.IsNullOrWhiteSpace(request.Deliverables) ? null : request.Deliverables.Trim(),
            RequiredDate = request.RequiredDate,
            Priority = request.Priority,
            StatusId = await workflow.FirstStatusIdAsync(ct),
            CreatedAt = clock.Now,
        };
        db.Jobs.Add(job);
        db.JobEvents.Add(new JobEvent
        {
            OrgId = job.OrgId,
            JobId = job.Id,
            UserId = currentUser.UserId,
            At = job.CreatedAt,
            Action = WorkflowAction.Submit,
            ToStatusId = job.StatusId,
        });
        await db.SaveChangesAsync(ct);
        return await GetAsync(job.Id, ct);
    }

    public async Task<JobDto> GetAsync(Guid id, CancellationToken ct)
    {
        var job = await JobDto.Load(db.Jobs).FirstOrDefaultAsync(j => j.Id == id, ct)
            ?? throw new NotFoundException("Job not found.");
        await jobAccess.EnsureCanSeeAsync(job, ct);
        return (await ToDtosAsync([job], ct))[0];
    }

    /// <summary>The jobs the signed-in user sent the brief for, newest first, in every team.</summary>
    public async Task<IReadOnlyList<JobDto>> GetMineAsync(CancellationToken ct)
    {
        var jobs = await JobDto.Load(db.Jobs)
            .Where(j => j.RequesterUserId == currentUser.UserId)
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync(ct);
        return await ToDtosAsync(jobs, ct);
    }

    /// <summary>
    /// The team's jobs the user may see, for the board (ViewBoard), or to book from the schedule (Allocate).
    /// </summary>
    public async Task<IReadOnlyList<JobDto>> GetTeamJobsAsync(Guid teamId, CancellationToken ct)
    {
        await teamAccess.EnsureCanOpenAsync(teamId, ct);
        if (!await permissions.HasAsync(Capability.ViewBoard, ct))
        {
            await permissions.EnsureAsync(Capability.Allocate, ct);
        }

        var jobs = await JobDto.Load(await jobAccess.VisibleAsync(ct)).Where(j => j.TeamId == teamId).ToListAsync(ct);
        return await ToDtosAsync(jobs, ct);
    }

    /// <summary>The team's incoming queue, newest first, for users who triage (TriageBriefs).</summary>
    public async Task<IReadOnlyList<JobDto>> GetIncomingAsync(Guid teamId, CancellationToken ct)
    {
        await teamAccess.EnsureAsync(teamId, Capability.TriageBriefs, ct);
        var incoming = (await workflow.IncomingAsync(ct)).ToList();
        var jobs = await JobDto.Load(db.Jobs)
            .Where(j => j.TeamId == teamId && incoming.Contains(j.StatusId))
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync(ct);
        return await ToDtosAsync(jobs, ct);
    }

    private async Task<IReadOnlyList<JobDto>> ToDtosAsync(IReadOnlyList<Job> jobs, CancellationToken ct)
    {
        var bookings = await JobBookings.LoadAsync(db, jobs.Select(j => j.Id).ToList(), ct);
        return jobs.Select(j => JobDto.From(j, clock.Today, bookings[j.Id])).ToList();
    }
}
