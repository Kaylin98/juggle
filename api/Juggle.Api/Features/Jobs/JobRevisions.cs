using Juggle.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Jobs;

/// <summary>How many revisions each of many jobs has had, in one query rather than one per job, for the revision badge.</summary>
public static class JobRevisions
{
    public static async Task<Dictionary<Guid, int>> CountsAsync(JuggleDbContext db, IReadOnlyCollection<Guid> jobIds, CancellationToken ct) =>
        await db.JobRevisions
            .Where(r => jobIds.Contains(r.JobId))
            .GroupBy(r => r.JobId)
            .Select(g => new { JobId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.JobId, g => g.Count, ct);
}
