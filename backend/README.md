# Clean Architecture — ledger12

Clean Architecture organises code into **concentric layers**. The core rule is simple:

> **Dependencies only point inward.** Outer layers know about inner layers, never the reverse.

```
         ┌─────────────────────────────┐
         │         MyApp.API           │  ← outermost (HTTP)
         │  ┌───────────────────────┐  │
         │  │  MyApp.Infrastructure │  │  ← data & external services
         │  │  ┌─────────────────┐  │  │
         │  │  │MyApp.Application│  │  │  ← business logic
         │  │  │  ┌───────────┐  │  │  │
         │  │  │  │MyApp.Domain│  │  │  │  ← innermost (pure models)
         │  │  │  └───────────┘  │  │  │
         │  │  └─────────────────┘  │  │
         │  └───────────────────────┘  │
         └─────────────────────────────┘
```

---

## Layer breakdown

### `ledger12.Domain` — the core

No dependencies on any other project or NuGet package. Pure C# only.

**What goes here:**
- Business entities
- Enums
- Custom domain exceptions
- Value objects (optional)

**Examples:**

```csharp
// Entities/Account.cs
public class Account
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Balance { get; private set; }

    public void Deposit(decimal amount)
    {
        if (amount <= 0) throw new DomainException("Deposit must be positive.");
        Balance += amount;
    }
}

// Entities/Transaction.cs
public class Transaction
{
    public Guid Id { get; set; }
    public Guid AccountId { get; set; }
    public decimal Amount { get; set; }
    public TransactionType Type { get; set; }
    public DateTime CreatedAt { get; set; }
}

// Enums/TransactionType.cs
public enum TransactionType { Credit, Debit }

// Exceptions/DomainException.cs
public class DomainException : Exception
{
    public DomainException(string message) : base(message) { }
}

// Exceptions/NotFoundException.cs
public class NotFoundException : Exception
{
    public NotFoundException(string entity, Guid id)
        : base($"{entity} with id '{id}' was not found.") { }
}
```

---

### `ledger12.Application` — business logic

References `Domain` only. Defines **what** the app can do, without caring **how** it's done (no EF Core, no HTTP, no file I/O).

**What goes here:**
- Service interfaces (`IAccountService`)
- Repository interfaces (`IAccountRepository`) — defined here, implemented in Infrastructure
- DTOs (Data Transfer Objects)
- Business logic / orchestration services
- Validators (FluentValidation)
- AutoMapper profiles

**Examples:**

```csharp
// Interfaces/IAccountRepository.cs
public interface IAccountRepository
{
    Task<Account?> GetByIdAsync(Guid id);
    Task<IEnumerable<Account>> GetAllAsync();
    Task AddAsync(Account account);
    Task SaveChangesAsync();
}

// Interfaces/IAccountService.cs
public interface IAccountService
{
    Task<AccountDto> GetAccountAsync(Guid id);
    Task<AccountDto> CreateAccountAsync(CreateAccountDto dto);
    Task DepositAsync(Guid accountId, decimal amount);
}

// DTOs/AccountDto.cs
public record AccountDto(Guid Id, string Name, decimal Balance);
public record CreateAccountDto(string Name, decimal InitialDeposit);

// Services/AccountService.cs
public class AccountService : IAccountService
{
    private readonly IAccountRepository _repo;
    private readonly IMapper _mapper;

    public AccountService(IAccountRepository repo, IMapper mapper)
    {
        _repo = repo;
        _mapper = mapper;
    }

    public async Task<AccountDto> GetAccountAsync(Guid id)
    {
        var account = await _repo.GetByIdAsync(id)
            ?? throw new NotFoundException(nameof(Account), id);
        return _mapper.Map<AccountDto>(account);
    }

    public async Task DepositAsync(Guid accountId, decimal amount)
    {
        var account = await _repo.GetByIdAsync(accountId)
            ?? throw new NotFoundException(nameof(Account), accountId);
        account.Deposit(amount);  // domain logic lives on the entity
        await _repo.SaveChangesAsync();
    }
}

// Validators/CreateAccountValidator.cs
public class CreateAccountValidator : AbstractValidator<CreateAccountDto>
{
    public CreateAccountValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.InitialDeposit).GreaterThanOrEqualTo(0);
    }
}

// Mappings/AutoMapperProfile.cs
public class AutoMapperProfile : Profile
{
    public AutoMapperProfile()
    {
        CreateMap<Account, AccountDto>();
        CreateMap<CreateAccountDto, Account>();
    }
}
```

---

### `ledger12.Infrastructure` — data & external I/O

References `Application`. Implements the interfaces defined there. This is the only place that talks to databases, file systems, or third-party APIs.

**What goes here:**
- `AppDbContext` (Entity Framework Core)
- Repository implementations
- Migrations
- External service clients (email, storage, payment gateways)

**Examples:**

```csharp
// Data/AppDbContext.cs
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Transaction> Transactions => Set<Transaction>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.Entity<Account>()
            .Property(a => a.Balance)
            .HasPrecision(18, 2);
    }
}

// Repositories/AccountRepository.cs
public class AccountRepository : IAccountRepository
{
    private readonly AppDbContext _db;

    public AccountRepository(AppDbContext db) => _db = db;

    public async Task<Account?> GetByIdAsync(Guid id) =>
        await _db.Accounts.FindAsync(id);

    public async Task<IEnumerable<Account>> GetAllAsync() =>
        await _db.Accounts.ToListAsync();

    public async Task AddAsync(Account account) =>
        await _db.Accounts.AddAsync(account);

    public async Task SaveChangesAsync() =>
        await _db.SaveChangesAsync();
}

// External/EmailService.cs
public class EmailService : IEmailService
{
    private readonly IConfiguration _config;

    public EmailService(IConfiguration config) => _config = config;

    public async Task SendWelcomeEmailAsync(string to, string name)
    {
        // call SendGrid, SMTP, etc.
    }
}
```

---

### `ledger12.API` — the entry point

References `Application` and `Infrastructure`. Handles HTTP: routing, auth, middleware, and wiring everything together via dependency injection.

**What goes here:**
- `Program.cs` — DI registration and middleware pipeline
- Controllers
- Middleware (error handling, logging)
- Extension methods to keep `Program.cs` clean

**Examples:**

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// Register application services
builder.Services.AddScoped<IAccountRepository, AccountRepository>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddAutoMapper(typeof(AutoMapperProfile));
builder.Services.AddValidatorsFromAssemblyContaining<CreateAccountValidator>();

var app = builder.Build();
app.UseMiddleware<ExceptionMiddleware>();
app.MapControllers();
app.Run();

// Controllers/AccountsController.cs
[ApiController]
[Route("api/[controller]")]
public class AccountsController : ControllerBase
{
    private readonly IAccountService _service;

    public AccountsController(IAccountService service) => _service = service;

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AccountDto>> Get(Guid id) =>
        Ok(await _service.GetAccountAsync(id));

    [HttpPost]
    public async Task<ActionResult<AccountDto>> Create(CreateAccountDto dto)
    {
        var result = await _service.CreateAccountAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpPost("{id:guid}/deposit")]
    public async Task<IActionResult> Deposit(Guid id, [FromBody] decimal amount)
    {
        await _service.DepositAsync(id, amount);
        return NoContent();
    }
}

// Middleware/ExceptionMiddleware.cs
public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;

    public ExceptionMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        try { await _next(context); }
        catch (NotFoundException ex)
        {
            context.Response.StatusCode = 404;
            await context.Response.WriteAsJsonAsync(new { error = ex.Message });
        }
        catch (DomainException ex)
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsJsonAsync(new { error = ex.Message });
        }
    }
}
```

---

### `ledger12.Tests` — tests

References `Application` and `Domain` only (not Infrastructure). If you need to test database behaviour, use an in-memory provider or a separate integration test project.

**Examples:**

```csharp
// Unit/AccountServiceTests.cs
public class AccountServiceTests
{
    private readonly Mock<IAccountRepository> _repoMock = new();
    private readonly IMapper _mapper;

    public AccountServiceTests()
    {
        var config = new MapperConfiguration(c => c.AddProfile<AutoMapperProfile>());
        _mapper = config.CreateMapper();
    }

    [Fact]
    public async Task GetAccountAsync_ThrowsNotFound_WhenAccountMissing()
    {
        _repoMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((Account?)null);
        var service = new AccountService(_repoMock.Object, _mapper);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.GetAccountAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task DepositAsync_IncreasesBalance()
    {
        var account = new Account { Id = Guid.NewGuid(), Name = "Test", Balance = 0 };
        _repoMock.Setup(r => r.GetByIdAsync(account.Id)).ReturnsAsync(account);
        var service = new AccountService(_repoMock.Object, _mapper);

        await service.DepositAsync(account.Id, 500);

        Assert.Equal(500, account.Balance);
    }
}
```

---

## Dependency reference summary

| Project | References |
|---|---|
| `ledger12.Domain` | nothing |
| `ledger12.Application` | Domain |
| `ledger12.Infrastructure` | Application |
| `ledger12.API` | Application, Infrastructure |
| `ledger12.Tests` | Application, Domain |

## Quick rule of thumb

- **"Does this know about the database?"** → Infrastructure
- **"Does this define what the app *can* do?"** → Application
- **"Is this a business concept (entity, rule, exception)?"** → Domain
- **"Is this HTTP-specific (route, status code, request body)?"** → API