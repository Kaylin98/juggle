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
    JobActionAccess actionAccess,
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
        return new JobOptionsDto(
            teams, departments, Enum.GetValues<Priority>(), Enum.GetValues<JobCategory>(), Enum.GetValues<DeliverableType>(), myDepartmentId);
    }

    /// <summary>
    /// Sends a brief: the job gets its job ID at once (D63), in the organisation's format, from the brand's next number
    /// and the quarter of the required date (today without one), and starts where the organisation's Submit step leads.
    /// The ID never changes afterwards (D71).
    /// </summary>
    public async Task<JobDetailDto> SubmitAsync(CreateJobRequest request, CancellationToken ct)
    {
        await permissions.EnsureAsync(Capability.SubmitBrief, ct);
        if (!await db.Teams.AnyAsync(t => t.Id == request.TeamId, ct))
        {
            throw new BadRequestException("Choose a team.");
        }
        var organisation = await db.Organisations.FirstAsync(ct);
        var department = await db.Departments.FirstOrDefaultAsync(d => d.Id == request.DepartmentId, ct)
            ?? throw new BadRequestException($"Choose a {organisation.DepartmentLabel.ToLowerInvariant()}.");
        if (request.RequiredDate < clock.Today || request.Deliverables.Any(d => d.DueDate < clock.Today))
        {
            throw new BadRequestException("A deadline can't be in the past.");
        }

        var (objectives, guidelines) = (request.Objectives, request.Guidelines);

        // The number is taken in the same transaction as the job, so a failed save does not use one up.
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var number = await NextNumberAsync(department.Id, ct);
        var title = request.Title.Trim();
        var job = new Job
        {
            OrgId = currentUser.OrgId,
            TeamId = request.TeamId,
            DepartmentId = department.Id,
            RequesterUserId = currentUser.UserId,
            Number = number,
            Code = JobCodes.Format(
                organisation.JobCodeFormat, department.JobCodePrefix ?? "", number, request.RequiredDate ?? clock.Today,
                organisation.FinancialYearStartMonth, title),
            Title = title,
            Campaign = Clean(request.Campaign),
            Category = request.Category,
            RevisesJobCode = Clean(request.RevisesJobCode),
            RequiredDate = request.RequiredDate,
            Priority = request.Priority,
            Purpose = Clean(objectives.Purpose),
            Objective = Clean(objectives.Objective),
            TargetAudience = Clean(objectives.TargetAudience),
            KeyMessage = Clean(objectives.KeyMessage),
            Channels = Clean(objectives.Channels),
            ExpectedOutcome = Clean(objectives.ExpectedOutcome),
            CreativeDirection = Clean(guidelines.CreativeDirection),
            BrandRequirements = Clean(guidelines.BrandRequirements),
            ColoursAndTypography = Clean(guidelines.ColoursAndTypography),
            DesignReferences = Clean(guidelines.DesignReferences),
            MandatoryMessaging = Clean(guidelines.MandatoryMessaging),
            RequiredLogos = Clean(guidelines.RequiredLogos),
            ProductImagery = Clean(guidelines.ProductImagery),
            LegalDisclaimers = Clean(guidelines.LegalDisclaimers),
            CreativeInstructions = Clean(guidelines.CreativeInstructions),
            AdditionalInformation = Clean(request.AdditionalInformation),
            StatusId = await workflow.FirstStatusIdAsync(ct),
            CreatedAt = clock.Now,
        };
        job.Deliverables.AddRange(request.Deliverables.Select((d, i) => new JobDeliverable
        {
            OrgId = job.OrgId,
            SortOrder = i,
            Type = d.Type,
            Description = d.Description.Trim(),
            Specifications = Clean(d.Specifications),
            DueDate = d.DueDate,
        }));
        job.Links.AddRange(request.Links.Select((l, i) => new JobLink { OrgId = job.OrgId, SortOrder = i, Url = l.Url.Trim(), Label = Clean(l.Label) }));
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
        await transaction.CommitAsync(ct);
        return await GetAsync(job.Id, ct);
    }

    /// <summary>
    /// Counts the brand's number up by one in a single statement (D71), which locks its row until the transaction ends,
    /// so two briefs sent at once never get the same number. Raw SQL skips the query filters, so it checks the org too.
    /// </summary>
    private async Task<int> NextNumberAsync(Guid departmentId, CancellationToken ct) =>
        (await db.Database
            .SqlQuery<int>($"""
                UPDATE "Departments" SET "LastJobNumber" = "LastJobNumber" + 1
                WHERE "Id" = {departmentId} AND "OrgId" = {currentUser.OrgId}
                RETURNING "LastJobNumber" AS "Value"
                """)
            .ToListAsync(ct))
        .Single();

    private static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    /// <summary>A job with its whole brief, for anyone who may see it.</summary>
    public async Task<JobDetailDto> GetAsync(Guid id, CancellationToken ct)
    {
        var job = await JobDto.Load(db.Jobs).Include(j => j.Links.OrderBy(l => l.SortOrder)).FirstOrDefaultAsync(j => j.Id == id, ct)
            ?? throw new NotFoundException("Job not found.");
        await jobAccess.EnsureCanSeeAsync(job, ct);
        return new JobDetailDto((await ToDtosAsync([job], ct))[0], BriefDto.From(job), await HistoryAsync(id, ct), await ArtworkAsync(job, ct));
    }

    /// <summary>
    /// The artwork versions. The user who briefed the job is not the designer or a viewer of all jobs, so sees none: no
    /// artwork reaches them before the head of design approves it.
    /// </summary>
    private async Task<IReadOnlyList<ArtworkDto>> ArtworkAsync(Job job, CancellationToken ct)
    {
        if (!await jobAccess.CanSeeArtworkAsync(job, ct))
        {
            return [];
        }

        return await (from a in db.JobArtwork.Where(a => a.JobId == job.Id)
                      join u in db.Users on a.SubmittedByUserId equals u.Id
                      orderby a.Version
                      select new ArtworkDto(a.Version, a.Url, a.Note, u.Name, a.SubmittedAt))
            .AsNoTracking()
            .ToListAsync(ct);
    }

    private async Task<IReadOnlyList<JobEventDto>> HistoryAsync(Guid jobId, CancellationToken ct) =>
        await (from e in db.JobEvents.Where(e => e.JobId == jobId)
               join u in db.Users on e.UserId equals u.Id
               join s in db.JobStatuses on e.ToStatusId equals s.Id
               orderby e.At, e.Id
               select new JobEventDto(e.At, e.Action, u.Name, s.Name, e.Message))
            .AsNoTracking()
            .ToListAsync(ct);

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

    private async Task<IReadOnlyList<JobDto>> ToDtosAsync(List<Job> jobs, CancellationToken ct)
    {
        var bookings = await JobBookings.LoadAsync(db, jobs.Select(j => j.Id).ToList(), ct);
        var dtos = new List<JobDto>(jobs.Count);
        foreach (var job in jobs)
        {
            dtos.Add(JobDto.From(job, clock.Today, bookings[job.Id], await actionAccess.AvailableAsync(job, ct)));
        }

        return dtos;
    }
}
