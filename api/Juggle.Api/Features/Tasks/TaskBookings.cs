using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Tasks;

/// <summary>
/// The bookings linked to tasks (D57), for many tasks in two queries rather than one per task. A booking's hours count
/// only on the person's working days (D13): weekends, public holidays and approved leave book nothing.
/// </summary>
public static class TaskBookings
{
    public static async Task<ILookup<Guid, TaskBookingDto>> LoadAsync(JuggleDbContext db, IReadOnlyCollection<Guid> taskIds, CancellationToken ct)
    {
        var allocations = await db.Allocations
            .Where(a => a.TaskId != null && taskIds.Contains(a.TaskId.Value))
            .OrderBy(a => a.StartDate)
            .Select(a => new { TaskId = a.TaskId!.Value, a.PersonId, a.Person.User.Name, a.StartDate, a.EndDate, a.HoursPerDay })
            .ToListAsync(ct);
        if (allocations.Count == 0)
        {
            return Array.Empty<TaskBookingDto>().ToLookup(_ => Guid.Empty);
        }

        var from = allocations.Min(a => a.StartDate);
        var to = allocations.Max(a => a.EndDate);
        var personIds = allocations.Select(a => a.PersonId).Distinct().ToList();
        var timeOff = await db.TimeOff
            .Where(t => t.Status == TimeOffStatus.Approved
                && (t.PersonId == null || personIds.Contains(t.PersonId.Value))
                && t.StartDate <= to && t.EndDate >= from)
            .AsNoTracking()
            .ToListAsync(ct);
        var daysOff = personIds.ToDictionary(id => id, id => DaysOff(timeOff.Where(t => t.PersonId == null || t.PersonId == id)));

        return allocations.ToLookup(a => a.TaskId, a => new TaskBookingDto(
            a.PersonId,
            a.Name,
            a.StartDate,
            a.EndDate,
            a.HoursPerDay,
            a.HoursPerDay * a.StartDate.WorkingDaysTo(a.EndDate, daysOff[a.PersonId])));
    }

    private static HashSet<DateOnly> DaysOff(IEnumerable<TimeOff> timeOff) =>
        timeOff
            .SelectMany(t => Enumerable.Range(0, t.EndDate.DayNumber - t.StartDate.DayNumber + 1).Select(t.StartDate.AddDays))
            .ToHashSet();
}
