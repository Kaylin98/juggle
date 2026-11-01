using System.ComponentModel.DataAnnotations;
using Juggle.Api.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace Juggle.Api.Features.Jobs;

/// <summary>A job on the board, in My requests and on its own page (D68).</summary>
/// <param name="Code">The job ID, fixed when the brief was sent (D63).</param>
/// <param name="Colour">The brand's colour, which its cards and bookings take (D61).</param>
/// <param name="ColumnId">The board column its status is in.</param>
/// <param name="StatusKind">Whether its status is open, done or cancelled.</param>
/// <param name="Deliverables">One per line as typed, without empty lines or bullets.</param>
/// <param name="CreatedAt">When the brief was sent: the date briefed.</param>
/// <param name="IsOverdue">Open and the required date has passed (D21).</param>
/// <param name="IsDueSoon">Open and required within the next 7 days, or overdue (D57).</param>
/// <param name="Bookings">Its bookings, earliest first.</param>
public sealed record JobDto(
    Guid Id,
    Guid TeamId,
    string TeamName,
    string Code,
    string Title,
    Guid DepartmentId,
    string Department,
    string Colour,
    string RequesterName,
    Guid StatusId,
    Guid ColumnId,
    string StatusName,
    string StatusColour,
    JobStatusKind StatusKind,
    Priority Priority,
    DateOnly? RequiredDate,
    DateTimeOffset CreatedAt,
    string? MainGoal,
    IReadOnlyList<string> Deliverables,
    Guid? DesignerPersonId,
    string? DesignerName,
    decimal? EstimateHours,
    DateOnly? PlannedStartDate,
    DateOnly? ExpectedCompletionDate,
    bool IsOverdue,
    bool IsDueSoon,
    decimal BookedHours,
    IReadOnlyList<JobBookingDto> Bookings)
{
    private const int DueSoonDays = 7;

    /// <summary>The jobs with what <see cref="From"/> maps, read without tracking.</summary>
    public static IQueryable<Job> Load(IQueryable<Job> jobs) => jobs
        .Include(j => j.Team)
        .Include(j => j.Department)
        .Include(j => j.Requester)
        .Include(j => j.Status)
        .Include(j => j.Designer).ThenInclude(p => p!.User)
        .AsNoTracking();

    /// <summary>Maps a job loaded with its team, brand, requester, status and designer's user.</summary>
    public static JobDto From(Job job, DateOnly today, IEnumerable<JobBookingDto> bookings)
    {
        var open = job.Status.Kind == JobStatusKind.Open;
        var linked = bookings.ToList();
        return new(
            job.Id,
            job.TeamId,
            job.Team.Name,
            job.Code,
            job.Title,
            job.DepartmentId,
            job.Department.Name,
            job.Department.Colour,
            job.Requester.Name,
            job.StatusId,
            job.Status.ColumnId,
            job.Status.Name,
            job.Status.Colour,
            job.Status.Kind,
            job.Priority,
            job.RequiredDate,
            job.CreatedAt,
            job.MainGoal,
            Jobs.Deliverables.Parse(job.Deliverables),
            job.DesignerPersonId,
            job.Designer?.User.Name,
            job.EstimateHours,
            job.PlannedStartDate,
            job.ExpectedCompletionDate,
            open && job.RequiredDate < today,
            open && job.RequiredDate <= today.AddDays(DueSoonDays),
            linked.Sum(b => b.Hours),
            linked);
    }
}

/// <param name="Hours">Hours per day on each of the person's working days from the start to the end date.</param>
public sealed record JobBookingDto(Guid PersonId, string PersonName, DateOnly StartDate, DateOnly EndDate, decimal HoursPerDay, decimal Hours);

public sealed record OptionDto(Guid Id, string Name);

/// <summary>A team to brief, with its colour for the dot beside its name.</summary>
public sealed record TeamOptionDto(Guid Id, string Name, string Colour);

/// <summary>What the brief form offers. The brand defaults to the first brand the user manages (D58).</summary>
public sealed record JobOptionsDto(
    IReadOnlyList<TeamOptionDto> Teams,
    IReadOnlyList<OptionDto> Departments,
    IReadOnlyList<Priority> Priorities,
    Guid? MyDepartmentId);

/// <summary>A brief in the studio's template (D50). The signed-in user sends it (D67).</summary>
public sealed record CreateJobRequest(
    Guid TeamId,
    [Required, MaxLength(200)] string Title,
    [MaxLength(2000)] string? MainGoal,
    [MaxLength(4000)] string? Deliverables,
    Guid DepartmentId,
    DateOnly? RequiredDate,
    Priority Priority);
