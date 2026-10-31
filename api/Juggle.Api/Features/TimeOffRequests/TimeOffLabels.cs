using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.TimeOffRequests;

/// <summary>How time off reads in the UI.</summary>
public static class TimeOffLabels
{
    /// <summary>Sick leave as others see it: health information is kept to the person and their admins (POPIA).</summary>
    public const string Unavailable = "Unavailable";

    /// <summary>The type of leave, or a public holiday's name.</summary>
    public static string For(TimeOff timeOff) => timeOff.Type switch
    {
        TimeOffType.AnnualLeave => "Annual leave",
        TimeOffType.SickLeave => "Sick leave",
        TimeOffType.FamilyResponsibility => "Family responsibility",
        TimeOffType.StudyLeave => "Study leave",
        TimeOffType.Other => "Time off",
        _ => timeOff.Description!,
    };

    /// <param name="showSickLeave">The viewer is the person or one of their admins (see <c>TeamAccess.ManagedPeople</c>).</param>
    public static string For(TimeOff timeOff, bool showSickLeave) =>
        timeOff.Type == TimeOffType.SickLeave && !showSickLeave ? Unavailable : For(timeOff);
}
