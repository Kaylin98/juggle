namespace Juggle.Api.Common;

/// <summary>The teamId query value of the schedule and dashboard: a team id, or "all" for every team (Org Admin only).</summary>
public static class TeamScope
{
    public const string All = "all";

    /// <returns>The team id, or null for every team.</returns>
    public static Guid? Parse(string teamId) => teamId == All
        ? null
        : Guid.TryParse(teamId, out var id) ? id : throw new BadRequestException("teamId must be a team id or \"all\".");
}
