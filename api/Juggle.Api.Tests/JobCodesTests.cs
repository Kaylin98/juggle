using Juggle.Api.Features.Jobs;

namespace Juggle.Api.Tests;

public sealed class JobCodesTests
{
    [Theory]
    // October start: Q1 = Oct-Dec, Q2 = Jan-Mar, Q3 = Apr-Jun, Q4 = Jul-Sep, named by the year it ends in.
    [InlineData(2026, 10, 1, 10, 1, 2027)]
    [InlineData(2026, 11, 27, 10, 1, 2027)]
    [InlineData(2026, 12, 31, 10, 1, 2027)]
    [InlineData(2027, 1, 1, 10, 2, 2027)]
    [InlineData(2027, 6, 30, 10, 3, 2027)]
    [InlineData(2027, 9, 30, 10, 4, 2027)]
    // March start: Q1 = Mar-May.
    [InlineData(2026, 3, 1, 3, 1, 2027)]
    [InlineData(2026, 11, 27, 3, 3, 2027)]
    [InlineData(2027, 2, 28, 3, 4, 2027)]
    // January start: the financial year is the calendar year.
    [InlineData(2026, 12, 31, 1, 4, 2026)]
    public void Financial_quarter_counts_from_the_start_month(int y, int m, int d, int startMonth, int quarter, int year)
    {
        Assert.Equal((quarter, year), JobCodes.FinancialQuarter(new DateOnly(y, m, d), startMonth));
    }

    [Fact]
    public void Format_fills_in_the_core_groups_tokens()
    {
        Assert.Equal(
            "DJI0143_Q1'27_Festive gifting",
            JobCodes.Format("{prefix}{number:4}_Q{quarter}'{yy}_{name}", "DJI", 143, new DateOnly(2026, 11, 13), 10, "Festive gifting"));
    }

    [Theory]
    [InlineData("{prefix}-{number}", "DJI-7")]
    [InlineData("{number:3}/{yy} {name}", "007/27 Gift guide")]
    [InlineData("{name} ({prefix}{number:2})", "Gift guide (DJI07)")]
    // An unknown token is kept as written, and a number wider than its width is not cut.
    [InlineData("{prefix}{number:1}_{year}", "DJI7_{year}")]
    public void Format_follows_the_organisations_format(string format, string expected)
    {
        Assert.Equal(expected, JobCodes.Format(format, "DJI", 7, new DateOnly(2026, 11, 13), 10, "Gift guide"));
    }

    [Fact]
    public void A_name_that_looks_like_a_token_is_kept()
    {
        Assert.Equal("DJI0001_{number}", JobCodes.Format("{prefix}{number:4}_{name}", "DJI", 1, new DateOnly(2026, 11, 13), 10, "{number}"));
    }
}
