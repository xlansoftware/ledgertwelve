using Microsoft.AspNetCore.Mvc;

namespace ledger12.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EchoController : ControllerBase
{
    [HttpGet]
    public ActionResult<string> Echo([FromQuery] string message)
    {
        return Ok(message);
    }
}
