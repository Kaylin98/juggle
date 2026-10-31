using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Requests;

/// <summary>
/// Work intake. Anyone in the organisation can ask a team for work; the team's admins (and Org Admins) triage
/// it: accepting makes a task in the status after Triage (D18), rejecting records a reason (D9).
/// </summary>
public sealed class RequestService(JuggleDbContext db, CurrentUser currentUser, TeamAccess teamAccess, OrgClock clock)
{
    public async Task<RequestOptionsDto> GetOptionsAsync(CancellationToken ct)
    {
        var teams = await db.Teams.OrderBy(t => t.Name).Select(t => new TeamOptionDto(t.Id, t.Name, t.Colour)).ToListAsync(ct);
        var departments = await db.Departments.OrderBy(d => d.Name).Select(d => new OptionDto(d.Id, d.Name)).ToListAsync(ct);
        var myDepartmentId = await db.Users.Where(u => u.Id == currentUser.UserId).Select(u => u.DepartmentId).FirstAsync(ct);
        var managers = await db.Users
            .Where(u => u.DepartmentId != null || u.Id == currentUser.UserId)
            .OrderBy(u => u.Name)
            .Select(u => new UserOptionDto(u.Id, u.Name, u.AvatarColour))
            .ToListAsync(ct);
        return new RequestOptionsDto(teams, departments, managers, Enum.GetValues<Priority>(), myDepartmentId);
    }

    public async Task<RequestDto> CreateAsync(CreateRequestRequest request, CancellationToken ct)
    {
        if (!await db.Teams.AnyAsync(t => t.Id == request.TeamId, ct))
        {
            throw new BadRequestException("Choose a team.");
        }
        if (!await db.Departments.AnyAsync(d => d.Id == request.DepartmentId, ct))
        {
            var label = await db.Organisations.Select(o => o.DepartmentLabel).FirstAsync(ct);
            throw new BadRequestException($"Choose a {label.ToLowerInvariant()}.");
        }
        if (!await db.Users.AnyAsync(u => u.Id == request.MarketingManagerUserId, ct))
        {
            throw new BadRequestException("Choose a marketing manager.");
        }
        if (Deliverables.Parse(request.Deliverables).Any(d => d.Length > Deliverables.MaxLength))
        {
            throw new BadRequestException($"Keep each deliverable under {Deliverables.MaxLength} characters.");
        }
        if (request.RequestedDueDate < clock.Today)
        {
            throw new BadRequestException("The deadline can't be in the past.");
        }

        var entity = new Request
        {
            OrgId = currentUser.OrgId,
            TeamId = request.TeamId,
            RequesterUserId = currentUser.UserId,
            DepartmentId = request.DepartmentId,
            MarketingManagerUserId = request.MarketingManagerUserId,
            Title = request.Title.Trim(),
            MainGoal = string.IsNullOrWhiteSpace(request.MainGoal) ? null : request.MainGoal.Trim(),
            Deliverables = string.IsNullOrWhiteSpace(request.Deliverables) ? null : request.Deliverables.Trim(),
            RequestedDueDate = request.RequestedDueDate,
            Priority = request.Priority,
            Status = RequestStatus.New,
            CreatedAt = clock.Now,
        };
        db.Requests.Add(entity);
        await db.SaveChangesAsync(ct);
        return await GetAsync(entity.Id, ct);
    }

    /// <summary>The requester sees their own request; the team's admins see every request to the team.</summary>
    public async Task<RequestDto> GetAsync(Guid id, CancellationToken ct)
    {
        var request = await Requests().FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new NotFoundException("Request not found.");
        if (request.RequesterUserId != currentUser.UserId)
        {
            await teamAccess.EnsureCanManageAsync(request.TeamId, ct);
        }
        return await ToDtoAsync(request, ct);
    }

    /// <summary>The signed-in user's own requests, newest first, to every team.</summary>
    public async Task<IReadOnlyList<RequestDto>> GetMineAsync(CancellationToken ct)
    {
        var requests = await Requests()
            .Where(r => r.RequesterUserId == currentUser.UserId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
        return await ToDtosAsync(requests, ct);
    }

    /// <summary>A team's requests, newest first, for its triage inbox.</summary>
    public async Task<IReadOnlyList<RequestDto>> GetTeamRequestsAsync(Guid teamId, RequestStatus? status, CancellationToken ct)
    {
        await teamAccess.EnsureCanManageAsync(teamId, ct);
        var requests = await Requests()
            .Where(r => r.TeamId == teamId && (status == null || r.Status == status))
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
        return await ToDtosAsync(requests, ct);
    }

    /// <summary>Makes a task from the request, at the end of the first column after Triage (D18).</summary>
    public async Task<RequestDto> AcceptAsync(Guid id, AcceptRequestRequest accept, CancellationToken ct)
    {
        var request = await FindNewAsync(id, ct);
        if (!await db.Projects.AnyAsync(p => p.Id == accept.ProjectId && p.TeamId == request.TeamId, ct))
        {
            throw new BadRequestException("Choose a project in this team.");
        }
        if (accept.AssigneePersonId is { } personId
            && !await db.People.AnyAsync(p => p.Id == personId && p.User.Memberships.Any(m => m.TeamId == request.TeamId), ct))
        {
            throw new BadRequestException("The assignee is not in this team.");
        }

        var status = await db.WorkflowStatuses
            .Where(s => s.TeamId == request.TeamId)
            .OrderBy(s => s.Order)
            .Skip(1)
            .FirstAsync(ct);
        var lastInColumn = await db.Tasks.Where(t => t.StatusId == status.Id).MaxAsync(t => (int?)t.SortOrder, ct);

        var task = new TaskItem
        {
            OrgId = request.OrgId,
            TeamId = request.TeamId,
            ProjectId = accept.ProjectId,
            Title = request.Title,
            Description = BriefDescription(request),
            StatusId = status.Id,
            AssigneePersonId = accept.AssigneePersonId,
            EstimateHours = accept.EstimateHours,
            DueDate = accept.DueDate,
            SortOrder = (lastInColumn ?? -1) + 1,
        };
        db.Tasks.Add(task);
        request.Status = RequestStatus.Accepted;
        request.TaskId = task.Id;
        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(request, ct);
    }

    public async Task<RequestDto> RejectAsync(Guid id, RejectRequestRequest reject, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(reject.Reason))
        {
            throw new BadRequestException("Give a reason.");
        }

        var request = await FindNewAsync(id, ct);
        request.Status = RequestStatus.Rejected;
        request.RejectionReason = reject.Reason.Trim();
        await db.SaveChangesAsync(ct);
        return await ToDtoAsync(request, ct);
    }

    private async Task<Request> FindNewAsync(Guid id, CancellationToken ct)
    {
        var request = await Requests().AsTracking().FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new NotFoundException("Request not found.");
        await teamAccess.EnsureCanManageAsync(request.TeamId, ct);
        if (request.Status != RequestStatus.New)
        {
            throw new BadRequestException("This request has already been triaged.");
        }
        return request;
    }

    private IQueryable<Request> Requests() => db.Requests
        .Include(r => r.Team)
        .Include(r => r.Department)
        .Include(r => r.Requester)
        .Include(r => r.MarketingManager)
        .AsNoTracking();

    private async Task<RequestDto> ToDtoAsync(Request request, CancellationToken ct) => (await ToDtosAsync([request], ct))[0];

    /// <summary>Maps requests to DTOs, with the assignee and due date of the tasks made from accepted ones.</summary>
    private async Task<IReadOnlyList<RequestDto>> ToDtosAsync(IReadOnlyList<Request> requests, CancellationToken ct)
    {
        var taskIds = requests.Where(r => r.TaskId != null).Select(r => r.TaskId!.Value).ToList();
        var tasks = await db.Tasks
            .Where(t => taskIds.Contains(t.Id))
            .Select(t => new { t.Id, Assignee = t.Assignee == null ? null : t.Assignee.User.Name, t.DueDate })
            .ToDictionaryAsync(t => t.Id, ct);
        return requests.Select(r =>
        {
            var task = r.TaskId is { } id ? tasks.GetValueOrDefault(id) : null;
            return ToDto(r, task?.Assignee, task?.DueDate);
        }).ToList();
    }

    private static RequestDto ToDto(Request r, string? assigneeName, DateOnly? committedDueDate) => new(
        r.Id,
        r.TeamId,
        r.Team.Name,
        r.Title,
        r.MainGoal,
        Deliverables.Parse(r.Deliverables),
        r.Department.Name,
        r.Requester.Name,
        r.MarketingManager?.Name,
        r.RequestedDueDate,
        r.Priority,
        r.Status,
        r.TaskId,
        r.RejectionReason,
        r.CreatedAt,
        assigneeName,
        committedDueDate);

    /// <summary>The brief as one task's description: the main goal and the deliverables under headings.</summary>
    private static string? BriefDescription(Request request)
    {
        var deliverables = Deliverables.Parse(request.Deliverables);
        var parts = new List<string>();
        if (request.MainGoal is { } goal)
        {
            parts.Add($"Main goal\n{goal}");
        }
        if (deliverables.Count > 0)
        {
            parts.Add("Deliverables\n" + string.Join("\n", deliverables.Select(d => $"- {d}")));
        }
        return parts.Count == 0 ? null : string.Join("\n\n", parts);
    }
}
