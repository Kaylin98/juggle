using Juggle.Api.Features.Requests;

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
    public void Name_joins_prefix_number_quarter_and_job_name()
    {
        Assert.Equal("DJI0143_Q1'27_Festive gifting", JobCodes.Name("DJI", 143, new DateOnly(2026, 11, 13), 10, "Festive gifting"));
    }

    [Fact]
    public void Next_number_follows_the_highest_for_the_prefix()
    {
        string[] names = ["DJI0141_Q1'27_Black Friday", "DJI0142_Q1'27_Amazon Brand Store", "dji0009_Q4'26_Old", "Ad hoc", "GOPRO0300_Q1'27_Bundles"];

        Assert.Equal(143, JobCodes.NextNumber("DJI", names));
        Assert.Equal(1, JobCodes.NextNumber("PURE", names));
    }
}
