using Juggle.Api.Data.Entities;
using Juggle.Api.Features.Capacity;
using Juggle.Api.Features.Tasks;
using Juggle.Api.Features.Teams;
using Juggle.Api.Features.TimeOffRequests;

namespace Juggle.Api.Features.MyWork;

/// <summary>The signed-in person's work across all their teams.</summary>
/// <param name="Person">The signed-in person.</param>
/// <param name="Tasks">Open tasks assigned to them: overdue first, then by due date, undated last.</param>
/// <param name="Days">Their load on each weekday of this week and next week.</param>
/// <param name="Bookings">Their bookings on those days, in every team.</param>
/// <param name="TimeOff">Their pending, approved and declined leave that has not ended yet, earliest first.</param>
public sealed record MyWorkDto(
    PersonDto Person,
    IReadOnlyList<MyTaskDto> Tasks,
    IReadOnlyList<DayLoad> Days,
    IReadOnlyList<AllocationDto> Bookings,
    IReadOnlyList<MyTimeOffDto> TimeOff);

public sealed record MyTaskDto(
    TaskDto Task,
    Guid TeamId,
    string TeamName,
    string ProjectName,
    string ProjectColour,
    Guid ProjectDepartmentId,
    string ProjectDepartment,
    string StatusName,
    StatusCategory Category);
