namespace Juggle.Api.Common;

/// <summary>Today's date in the organisation's time zone. The demo has one organisation, in Johannesburg.</summary>
public sealed class OrgClock(TimeProvider time)
{
    public const string TimeZoneId = "Africa/Johannesburg";

    private static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);

    public DateOnly Today => DateOf(time.GetUtcNow());

    public DateTimeOffset Now => time.GetUtcNow();

    /// <summary>The organisation's date at an instant, such as the day a request was sent.</summary>
    public static DateOnly DateOf(DateTimeOffset instant) => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, Zone).DateTime);
}
