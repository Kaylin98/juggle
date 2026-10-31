using Microsoft.AspNetCore.Mvc;

namespace Juggle.Api.Features.MyWork;

[ApiController]
[Route("api/my-work")]
public sealed class MyWorkController(MyWorkService myWork) : ControllerBase
{
    [HttpGet]
    public Task<MyWorkDto> Get(CancellationToken ct) => myWork.GetAsync(ct);
}
