using Juggle.Api.Common;
using Juggle.Api.Data.Entities;
using Juggle.Api.Features.TimeOffRequests;

namespace Juggle.Api.Features.Capacity;

/// <summary>
/// One person's capacity and booked hours on one day. TimeOff names the reason the day is not worked;
/// PublicHoliday says it is a public holiday, so TimeOff is the holiday's name. PendingTimeOff names leave
/// waiting for approval, which does not change the day's capacity (D17).
/// </summary>
public sealed record DayLoad(DateOnly Date, decimal Capacity, decimal Allocated, string? TimeOff, bool PublicHoliday, string? PendingTimeOff);

/// <summary>Capacity rules (D13, D14): a working day is a weekday that is not a public holiday or approved leave.</summary>
public static class CapacityCalculator
{
    /// <param name="allocations">The person's allocations.</param>
    /// <param name="timeOff">The person's leave and the public holidays. Only approved leave reduces capacity.</param>
    /// <param name="showSickLeave">The viewer may see sick leave; otherwise it reads "Unavailable".</param>
    public static DayLoad ForDay(
        Person person,
        DateOnly date,
        IEnumerable<Allocation> allocations,
        IEnumerable<TimeOff> timeOff,
        bool showSickLeave = true)
    {
        if (date.IsWeekend())
        {
            return new DayLoad(date, 0, 0, "Weekend", false, null);
        }

        // Allocations only count on working days, so leave and holidays never create clashes.
        var onDay = timeOff.Where(t => t.StartDate <= date && date <= t.EndDate).ToList();
        if (onDay.FirstOrDefault(t => t.Status == TimeOffStatus.Approved) is { } off)
        {
            return new DayLoad(date, 0, 0, TimeOffLabels.For(off, showSickLeave), off.Type == TimeOffType.PublicHoliday, null);
        }

        var pending = onDay.FirstOrDefault(t => t.Status == TimeOffStatus.Pending);
        var allocated = allocations.Where(a => a.StartDate <= date && date <= a.EndDate).Sum(a => a.HoursPerDay);
        return new DayLoad(date, person.HoursPerDay, allocated, null, false, pending is null ? null : TimeOffLabels.For(pending, showSickLeave));
    }
}
