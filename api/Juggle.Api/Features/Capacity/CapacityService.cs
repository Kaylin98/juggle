using Juggle.Api.Auth;
using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Capacity;

public sealed class CapacityService(JuggleDbContext db, CurrentUser currentUser, TeamAccess teamAccess)
{
    /// <summary>
    /// The schedule for a team, or for everyone when teamId is null (Org Admin only).
    /// Load counts every allocation a person has, including other teams' projects.
    /// </summary>
    public async Task<CapacityDto> GetAsync(Guid? teamId, DateOnly start, int weeks, CancellationToken ct)
    {
        var from = start.StartOfWeek();
        var to = from.AddDays((weeks * 7) - 1);
        var days = Enumerable.Range(0, weeks * 7).Select(from.AddDays).Where(d => !d.IsWeekend()).ToList();

        var query = db.People.AsQueryable();
        if (teamId is { } id)
        {
            await teamAccess.EnsureCanViewAsync(id, ct);
            query = query.Where(p => p.User.Memberships.Any(m => m.TeamId == id));
        }
        else if (!currentUser.IsOrgAdmin)
        {
            throw new ForbiddenException("Only org admins can see every team.");
        }

        var team = await query.Include(p => p.User).OrderBy(p => p.User.Name).AsNoTracking().ToListAsync(ct);
        var personIds = team.Select(p => p.Id).ToList();

        var allocations = await db.Allocations
            .Include(a => a.Project).ThenInclude(p => p.Department)
            .Where(a => personIds.Contains(a.PersonId) && a.StartDate <= to && a.EndDate >= from)
            .OrderBy(a => a.StartDate)
            .ThenBy(a => a.Project.Name)
            .AsNoTracking()
            .ToListAsync(ct);

        var teamNames = await db.Teams.ToDictionaryAsync(t => t.Id, t => t.Name, ct);

        // Approved leave and holidays reduce capacity; pending leave is shown but does not (D17).
        var timeOff = await db.TimeOff
            .Where(t => (t.Status == TimeOffStatus.Approved || t.Status == TimeOffStatus.Pending)
                && (t.PersonId == null || personIds.Contains(t.PersonId.Value))
                && t.StartDate <= to && t.EndDate >= from)
            .AsNoTracking()
            .ToListAsync(ct);

        // Sick leave shows only to the person and their admins (POPIA); everyone else sees "Unavailable".
        var managed = await teamAccess.ManagedPeople().Where(p => personIds.Contains(p.Id)).Select(p => p.Id).ToListAsync(ct);

        var people = team.Select(person =>
        {
            var personAllocations = allocations.Where(a => a.PersonId == person.Id).ToList();
            var personTimeOff = timeOff.Where(t => t.PersonId == null || t.PersonId == person.Id).ToList();
            var showSickLeave = person.UserId == currentUser.UserId || managed.Contains(person.Id);
            return new CapacityPersonDto(
                person.Id,
                person.User.Name,
                person.User.AvatarColour,
                person.JobTitle,
                person.HoursPerDay,
                days.Select(d => CapacityCalculator.ForDay(person, d, personAllocations, personTimeOff, showSickLeave)).ToList());
        }).ToList();

        return new CapacityDto(
            days,
            people,
            allocations.Select(a => AllocationDto.From(a, teamNames[a.Project.TeamId], teamId is not null && a.Project.TeamId != teamId)).ToList());
    }
}
