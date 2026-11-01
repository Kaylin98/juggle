using System.Globalization;
using System.Text.RegularExpressions;

namespace Juggle.Api.Features.Jobs;

/// <summary>
/// Job IDs in the organisation's format (D63, D77), such as The Core Group's
/// <c>{prefix}{number:4}_Q{quarter}'{yy}_{name}</c>, which gives <c>DJI0143_Q1'27_Summer Holiday Sale</c>. The tokens are
/// the brand's prefix, its job number (zero-padded to the width given), the financial quarter and two-digit financial
/// year of the required date, and the job name. Anything else in the format is kept as it is.
/// </summary>
public static partial class JobCodes
{
    public static string Format(string format, string prefix, int number, DateOnly date, int financialYearStartMonth, string jobName)
    {
        var (quarter, year) = FinancialQuarter(date, financialYearStartMonth);
        return Token().Replace(format, match => match.Groups["token"].Value switch
        {
            "prefix" => prefix,
            "number" => number.ToString(CultureInfo.InvariantCulture)
                .PadLeft(match.Groups["width"].Success ? int.Parse(match.Groups["width"].Value, CultureInfo.InvariantCulture) : 0, '0'),
            "quarter" => quarter.ToString(CultureInfo.InvariantCulture),
            "yy" => (year % 100).ToString("D2", CultureInfo.InvariantCulture),
            _ => jobName,
        });
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

    [GeneratedRegex(@"\{(?<token>prefix|number|quarter|yy|name)(?::(?<width>\d+))?\}")]
    private static partial Regex Token();
}
