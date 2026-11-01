using Juggle.Api.Common;
using Juggle.Api.Data;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Auth;

/// <summary>
/// Which jobs the signed-in user may see, by capability (D70, D77): every job with ViewAllJobs, otherwise the jobs
/// they sent the brief for or are the designer of (CD5).
/// </summary>
public sealed class JobAccess(JuggleDbContext db, CurrentUser currentUser, Permissions permissions)
{
    public async Task<IQueryable<Job>> VisibleAsync(CancellationToken ct) => await permissions.HasAsync(Capability.ViewAllJobs, ct)
        ? db.Jobs
        : db.Jobs.Where(j => j.RequesterUserId == currentUser.UserId || (j.Designer != null && j.Designer.UserId == currentUser.UserId));

    public async Task EnsureCanSeeAsync(Job job, CancellationToken ct)
    {
        var mine = job.RequesterUserId == currentUser.UserId
            || (job.DesignerPersonId is { } designerId && await db.People.AnyAsync(p => p.Id == designerId && p.UserId == currentUser.UserId, ct));
        if (!mine && !await permissions.HasAsync(Capability.ViewAllJobs, ct))
        {
            throw new ForbiddenException("You can only see the jobs you briefed or are working on.");
        }
    }
}
