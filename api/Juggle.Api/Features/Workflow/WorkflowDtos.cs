using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Workflow;

/// <summary>The organisation's board (D64, D77): its columns in order, each with its statuses in order.</summary>
/// <param name="ScheduledStatusIds">The statuses Allocate and schedule leads to, whose cards show "Starts &lt;date&gt;" (D76).</param>
/// <param name="Steps">Where each action can be taken from and where it leads, so the board can tell which action a card dropped in a column calls for (D74).</param>
public sealed record WorkflowDto(
    IReadOnlyList<BoardColumnDto> Columns, IReadOnlyList<Guid> ScheduledStatusIds, IReadOnlyList<WorkflowStepDto> Steps);

public sealed record WorkflowStepDto(WorkflowAction Action, Guid FromStatusId, Guid ToStatusId);

public sealed record BoardColumnDto(Guid Id, string Name, IReadOnlyList<JobStatusDto> Statuses);

public sealed record JobStatusDto(Guid Id, string Name, string Colour, JobStatusKind Kind);
