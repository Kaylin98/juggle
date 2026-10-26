namespace Juggle.Api.Data.Seed;

/// <summary>South African public holidays. A holiday that falls on a Sunday moves to the Monday.</summary>
public static class SouthAfricanHolidays
{
    public static IEnumerable<(DateOnly Date, string Name)> For(int year)
    {
        var easter = EasterSunday(year);
        (DateOnly Date, string Name)[] holidays =
        [
            (new(year, 1, 1), "New Year's Day"),
            (new(year, 3, 21), "Human Rights Day"),
            (easter.AddDays(-2), "Good Friday"),
            (easter.AddDays(1), "Family Day"),
            (new(year, 4, 27), "Freedom Day"),
            (new(year, 5, 1), "Workers' Day"),
            (new(year, 6, 16), "Youth Day"),
            (new(year, 8, 9), "National Women's Day"),
            (new(year, 9, 24), "Heritage Day"),
            (new(year, 12, 16), "Day of Reconciliation"),
            (new(year, 12, 25), "Christmas Day"),
            (new(year, 12, 26), "Day of Goodwill"),
        ];

        var observed = holidays
            .Where(h => h.Date.DayOfWeek == DayOfWeek.Sunday)
            .Select(h => (Date: h.Date.AddDays(1), Name: $"{h.Name} (observed)"));

        return holidays.Concat(observed).DistinctBy(h => h.Date).OrderBy(h => h.Date);
    }

    // Anonymous Gregorian algorithm.
    private static DateOnly EasterSunday(int year)
    {
        var a = year % 19;
        var b = year / 100;
        var c = year % 100;
        var d = b / 4;
        var e = b % 4;
        var f = (b + 8) / 25;
        var g = (b - f + 1) / 3;
        var h = ((19 * a) + b - d - g + 15) % 30;
        var i = c / 4;
        var k = c % 4;
        var l = (32 + (2 * e) + (2 * i) - h - k) % 7;
        var m = (a + (11 * h) + (22 * l)) / 451;
        var month = (h + l - (7 * m) + 114) / 31;
        var day = ((h + l - (7 * m) + 114) % 31) + 1;
        return new DateOnly(year, month, day);
    }
}
