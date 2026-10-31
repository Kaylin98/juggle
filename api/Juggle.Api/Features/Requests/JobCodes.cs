using System.Globalization;
using System.Text.RegularExpressions;

namespace Juggle.Api.Features.Requests;

/// <summary>
/// Job codes name a brief's project: <c>&lt;PREFIX&gt;&lt;NNNN&gt;_Q&lt;n&gt;'&lt;YY&gt;_&lt;job name&gt;</c>, such as
/// <c>DJI0141_Q1'27_Black Friday</c> (D52). The prefix is the department's, the number counts up per prefix, and the
/// quarter is the financial quarter of the deadline.
/// </summary>
public static class JobCodes
{
    /// <summary>The 8 project hues (the palette under "Design" in CLAUDE.md), in the order new briefs take them.</summary>
    public static readonly IReadOnlyList<string> Palette =
        ["#5b8def", "#3fa7a0", "#6aa36f", "#d9a441", "#e07a5f", "#d16b8f", "#8a78d6", "#7b8ea8"];

    public static string Name(string prefix, int number, DateOnly deadline, int financialYearStartMonth, string jobName)
    {
        var (quarter, year) = FinancialQuarter(deadline, financialYearStartMonth);
        return $"{prefix}{number:D4}_Q{quarter}'{year % 100:D2}_{jobName}";
    }

    /// <summary>
    /// The date's quarter of the financial year starting in the given month, and the year that financial year is named
    /// by: the calendar year it ends in (with an October start, October 2026 is Q1 of 2027).
    /// </summary>
    public static (int Quarter, int Year) FinancialQuarter(DateOnly date, int startMonth)
    {
        var monthsIn = (date.Month - startMonth + 12) % 12;
        var year = startMonth == 1 || date.Month < startMonth ? date.Year : date.Year + 1;
        return ((monthsIn / 3) + 1, year);
    }

    /// <summary>One more than the highest number after the prefix in the given project names; 1 when there is none.</summary>
    public static int NextNumber(string prefix, IEnumerable<string> projectNames)
    {
        var pattern = new Regex($"^{Regex.Escape(prefix)}(\\d{{4}})", RegexOptions.IgnoreCase);
        return projectNames
            .Select(name => pattern.Match(name))
            .Where(match => match.Success)
            .Select(match => int.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture))
            .DefaultIfEmpty(0)
            .Max() + 1;
    }

    /// <summary>The first palette hue not in use; the first hue again once all are.</summary>
    public static string NextColour(IEnumerable<string> usedColours)
    {
        var used = usedColours.ToHashSet(StringComparer.OrdinalIgnoreCase);
        return Palette.FirstOrDefault(colour => !used.Contains(colour)) ?? Palette[0];
    }
}
