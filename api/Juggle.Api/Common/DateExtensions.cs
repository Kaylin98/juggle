namespace Juggle.Api.Common;

public static class DateExtensions
{
    /// <summary>The Monday of the week containing this date.</summary>
    public static DateOnly StartOfWeek(this DateOnly date) => date.AddDays(-(((int)date.DayOfWeek + 6) % 7));

    public static bool IsWeekend(this DateOnly date) => date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;

    /// <summary>The weekdays from this date to the end date (inclusive) that are not public holidays.</summary>
    public static int WorkingDaysTo(this DateOnly start, DateOnly end, IReadOnlySet<DateOnly> holidays) =>
        Enumerable.Range(0, end.DayNumber - start.DayNumber + 1)
            .Select(start.AddDays)
            .Count(d => !d.IsWeekend() && !holidays.Contains(d));
}
