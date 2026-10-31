using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.TimeOffRequests;

/// <summary>
/// Time off requests (D47). Anyone with a Person record asks for their own time off and can cancel it while it is
/// pending. Team Admins of any team the person is in, and Org Admins, approve or decline it.
/// </summary>
public sealed class TimeOffService(JuggleDbContext db, CurrentUser currentUser, TeamAccess teamAccess)
{
    private const int MaxDays = 366;

    public async Task<MyTimeOffDto> RequestAsync(RequestTimeOffRequest request, CancellationToken ct)
    {
        var person = await db.People.FirstOrDefaultAsync(p => p.UserId == currentUser.UserId, ct)
            ?? throw new ForbiddenException("Only people on a team's schedule can request time off.");

        if (request.Type == TimeOffType.PublicHoliday)
        {
            throw new BadRequestException("Choose a type of leave.");
        }
        if (request.EndDate < request.StartDate)
        {
            throw new BadRequestException("The end date must be on or after the start date.");
        }
        if (request.EndDate.DayNumber - request.StartDate.DayNumber >= MaxDays)
        {
            throw new BadRequestException("Time off can be at most a year long.");
        }

        var holidays = await HolidaysAsync(ct);
        if (request.StartDate.WorkingDaysTo(request.EndDate, holidays) == 0)
        {
            throw new BadRequestException("Choose dates with at least one working day.");
        }
        if (await db.TimeOff.AnyAsync(t => t.PersonId == person.Id
            && (t.Status == TimeOffStatus.Pending || t.Status == TimeOffStatus.Approved)
            && t.StartDate <= request.EndDate && t.EndDate >= request.StartDate, ct))
        {
            throw new BadRequestException("You already have time off on some of these days.");
        }

        var timeOff = new TimeOff
        {
            OrgId = currentUser.OrgId,
            PersonId = person.Id,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Type = request.Type,
            Status = TimeOffStatus.Pending,
            Note = string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim(),
        };
        db.TimeOff.Add(timeOff);
        await db.SaveChangesAsync(ct);
        return MyTimeOffDto.From(timeOff, holidays);
    }

    public async Task CancelAsync(Guid id, CancellationToken ct)
    {
        var timeOff = await FindLeaveAsync(id, ct);
        if (!await db.People.AnyAsync(p => p.Id == timeOff.PersonId && p.UserId == currentUser.UserId, ct))
        {
            throw new ForbiddenException("You can only cancel your own time off.");
        }
        if (timeOff.Status != TimeOffStatus.Pending)
        {
            throw new BadRequestException("Only pending requests can be cancelled.");
        }

        timeOff.Status = TimeOffStatus.Cancelled;
        await db.SaveChangesAsync(ct);
    }

    /// <summary>The pending requests the viewer can decide, earliest first. Approvers see sick leave as it is.</summary>
    public async Task<IReadOnlyList<TimeOffApprovalDto>> GetApprovalsAsync(CancellationToken ct)
    {
        var managed = teamAccess.ManagedPeople().Select(p => p.Id);
        var pending = await db.TimeOff
            .Where(t => t.Status == TimeOffStatus.Pending && managed.Contains(t.PersonId!.Value))
            .OrderBy(t => t.StartDate)
            .AsNoTracking()
            .ToListAsync(ct);

        var personIds = pending.Select(t => t.PersonId!.Value).Distinct().ToList();
        var people = await db.People
            .Where(p => personIds.Contains(p.Id))
            .Select(p => new
            {
                p.Id,
                p.User.Name,
                p.User.AvatarColour,
                p.JobTitle,
                Teams = p.User.Memberships.OrderBy(m => m.Team.Name).Select(m => m.Team.Name).ToList(),
            })
            .ToDictionaryAsync(p => p.Id, ct);
        var holidays = await HolidaysAsync(ct);

        return pending.Select(t =>
        {
            var person = people[t.PersonId!.Value];
            return new TimeOffApprovalDto(
                t.Id,
                person.Id,
                person.Name,
                person.AvatarColour,
                person.JobTitle,
                person.Teams,
                TimeOffLabels.For(t),
                t.StartDate,
                t.EndDate,
                t.StartDate.WorkingDaysTo(t.EndDate, holidays),
                t.Note);
        }).ToList();
    }

    public async Task ApproveAsync(Guid id, CancellationToken ct)
    {
        var timeOff = await FindDecidableAsync(id, ct);
        timeOff.Status = TimeOffStatus.Approved;
        await db.SaveChangesAsync(ct);
    }

    public async Task DeclineAsync(Guid id, DeclineTimeOffRequest decline, CancellationToken ct)
    {
        var timeOff = await FindDecidableAsync(id, ct);
        timeOff.Status = TimeOffStatus.Declined;
        timeOff.DeclineReason = decline.Reason.Trim();
        await db.SaveChangesAsync(ct);
    }

    /// <summary>A pending request the viewer may approve or decline (D47).</summary>
    private async Task<TimeOff> FindDecidableAsync(Guid id, CancellationToken ct)
    {
        var timeOff = await FindLeaveAsync(id, ct);
        if (!await teamAccess.ManagedPeople().AnyAsync(p => p.Id == timeOff.PersonId, ct))
        {
            throw new ForbiddenException("Only an admin of this person's team can approve or decline their time off.");
        }
        if (timeOff.Status != TimeOffStatus.Pending)
        {
            throw new BadRequestException("Only pending requests can be approved or declined.");
        }
        return timeOff;
    }

    /// <summary>A person's time off; public holidays are not requests.</summary>
    private async Task<TimeOff> FindLeaveAsync(Guid id, CancellationToken ct) =>
        await db.TimeOff.FirstOrDefaultAsync(t => t.Id == id && t.PersonId != null, ct)
            ?? throw new NotFoundException("Time off not found.");

    private async Task<HashSet<DateOnly>> HolidaysAsync(CancellationToken ct) =>
        (await db.TimeOff
            .Where(t => t.Type == TimeOffType.PublicHoliday && t.Status == TimeOffStatus.Approved)
            .Select(t => t.StartDate)
            .ToListAsync(ct))
        .ToHashSet();
}
