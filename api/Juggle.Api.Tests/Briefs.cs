using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Jobs;

namespace Juggle.Api.Tests;

/// <summary>Briefs for tests that need one but not its sections.</summary>
internal static class Briefs
{
    public static readonly BriefObjectives NoObjectives = new(null, null, null, null, null, null);

    public static readonly CreativeGuidelines NoGuidelines = new(null, null, null, null, null, null, null, null, null);

    /// <summary>Only what a brief needs: the team, the brand and a title.</summary>
    public static CreateJobRequest Minimal(Guid teamId, Guid departmentId, string title, DateOnly? requiredDate = null) =>
        new(teamId, departmentId, title, null, null, null, requiredDate, Priority.Medium, NoObjectives, [], NoGuidelines, [], null);
}
