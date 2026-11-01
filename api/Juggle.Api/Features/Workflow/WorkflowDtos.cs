using Juggle.Api.Data.Entities;

namespace Juggle.Api.Features.Workflow;

/// <summary>The organisation's board (D64, D77): its columns in order, each with its statuses in order.</summary>
/// <param name="ScheduledStatusIds">The statuses Allocate and schedule leads to, whose cards show "Starts &lt;date&gt;" (D76).</param>
public sealed record WorkflowDto(IReadOnlyList<BoardColumnDto> Columns, IReadOnlyList<Guid> ScheduledStatusIds);

public sealed record BoardColumnDto(Guid Id, string Name, IReadOnlyList<JobStatusDto> Statuses);

public sealed record JobStatusDto(Guid Id, string Name, string Colour, JobStatusKind Kind);
