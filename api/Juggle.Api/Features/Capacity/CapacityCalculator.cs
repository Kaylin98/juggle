using Juggle.Api.Common;
using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Capacity;

/// <summary>One person's capacity and booked hours on one day. TimeOff names the reason the day is not worked.</summary>
public sealed record DayLoad(DateOnly Date, decimal Capacity, decimal Allocated, string? TimeOff);

/// <summary>Capacity rules (D13, D14): a working day is a weekday that is not a public holiday or approved leave.</summary>
public static class CapacityCalculator
{
    /// <param name="allocations">The person's allocations.</param>
    /// <param name="timeOff">Approved time off: the person's leave and public holidays.</param>
    public static DayLoad ForDay(Person person, DateOnly date, IEnumerable<Allocation> allocations, IEnumerable<TimeOff> timeOff)
    {
        var reason = date.IsWeekend()
            ? "Weekend"
            : timeOff.FirstOrDefault(t => t.StartDate <= date && date <= t.EndDate)?.Description;

        // Allocations only count on working days, so leave and holidays never create clashes.
        if (reason is not null)
        {
            return new DayLoad(date, 0, 0, reason);
        }

        var allocated = allocations.Where(a => a.StartDate <= date && date <= a.EndDate).Sum(a => a.HoursPerDay);
        return new DayLoad(date, person.HoursPerDay, allocated, null);
    }
}
