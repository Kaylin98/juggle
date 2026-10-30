using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.Tasks;

[ApiController]
public sealed class TasksController(TasksService tasks) : ControllerBase
{
    [HttpGet("api/teams/{teamId:guid}/tasks")]
    public Task<IReadOnlyList<TaskDto>> GetTeamTasks(Guid teamId, CancellationToken ct) => tasks.GetTeamTasksAsync(teamId, ct);

    [HttpPost("api/teams/{teamId:guid}/tasks")]
    public async Task<ActionResult<TaskDto>> Create(Guid teamId, CreateTaskRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await tasks.CreateAsync(teamId, request, ct));

    [HttpPut("api/tasks/{id:guid}")]
    public Task<TaskDto> Update(Guid id, UpdateTaskRequest request, CancellationToken ct) => tasks.UpdateAsync(id, request, ct);

    [HttpPost("api/tasks/{id:guid}/move")]
    public Task<TaskDto> Move(Guid id, MoveTaskRequest request, CancellationToken ct) => tasks.MoveAsync(id, request, ct);
}
