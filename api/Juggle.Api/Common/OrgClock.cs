namespace Juggle.Api.Common;

/// <summary>Today's date in the organisation's time zone. The demo has one organisation, in Johannesburg.</summary>
public sealed class OrgClock(TimeProvider time)
{
    public const string TimeZoneId = "Africa/Johannesburg";

    private static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);

    public DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(time.GetUtcNow(), Zone).DateTime);

    public DateTimeOffset Now => time.GetUtcNow();
}
