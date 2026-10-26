namespace Juggle.Api.Common;

public static class DateExtensions
{
    /// <summary>The Monday of the week containing this date.</summary>
    public static DateOnly StartOfWeek(this DateOnly date) => date.AddDays(-(((int)date.DayOfWeek + 6) % 7));

    public static bool IsWeekend(this DateOnly date) => date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
}
