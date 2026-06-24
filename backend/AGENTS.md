# AGENTS.md

Guidance for LLM agents working on the **ledger12** backend.
Read this file fully before making any changes.

---

## Project overview

**ledger12** is a financial ledger application with:
- **Backend** — ASP.NET Core Web API, Clean Architecture, Entity Framework Core
- **Frontend** — React 18, Vite, TypeScript, Vitest

```
└── backend/          # .NET solution (ledger12.sln)
    ├── API.md
    ├── ledger12.API/
    ├── ledger12.Application/
    ├── ledger12.Domain/
    └── ledger12.Infrastructure/
```

---

## Architecture rules — never violate these

The backend follows **Clean Architecture**. Dependencies only point inward:

```
API → Infrastructure → Application → Domain
```

| Layer | May reference | Must NOT reference |
|---|---|---|
| `ledger12.Domain` | nothing | anything |
| `ledger12.Application` | Domain | Infrastructure, API |
| `ledger12.Infrastructure` | Application, Domain | API |
| `ledger12.API` | Application, Infrastructure | — |
| `ledger12.Tests` | Application, Domain | Infrastructure, API |

**If a task would require breaking these rules, stop and ask for clarification.**

### API layer

API contains:

* controllers
* middleware
* filters
* dependency injection

API should contain no business logic.

### Domain layer

The Domain layer contains:

* entities
* value objects
* domain exceptions
* business rules
* domain events

The Domain layer must not depend on:

* Entity Framework
* ASP.NET Core
* MediatR
* FluentValidation
* Infrastructure concerns

---

### Application layer

The Application layer contains:

* use cases
* commands
* queries
* DTOs
* validators
* interfaces

The Application layer orchestrates business workflows but does not perform persistence directly.

---

### Infrastructure layer

Infrastructure contains:

* EF Core
* repositories
* external APIs
* file storage
* email providers

Infrastructure implements interfaces defined by Application.

## DTO Rules

* Request DTOs belong to Application.
* Response DTOs belong to Application.
* Domain entities must never be returned directly from controllers.
* Controllers return DTOs only.
* EF entities must never cross layer boundaries.
* Mapping should be explicit and predictable.

---

## API Contract Ownership

### Source of truth

`API.md` is the authoritative API contract.

Backend development implements the contract documented in `API.md`.

---

### Backend responsibilities

When implementing a feature:

1. Read the endpoint specification in `API.md`.
2. Implement the documented route.
3. Implement the documented request DTO.
4. Implement the documented response DTO.
5. Implement the documented error responses.

The backend should conform to the contract rather than redesign it.

---

### If the contract appears problematic

If an endpoint in `API.md`:

* violates domain rules
* creates security concerns
* creates significant performance issues
* cannot be implemented reasonably

do not silently change the API.

Instead:

1. Explain the issue.
2. Propose an alternative contract.
3. Request approval before modifying `API.md`.

---

### Contract synchronization

When implementing an endpoint:

* API route
* request DTOs
* response DTOs
* validation rules
* status codes

must remain consistent with `API.md`.

If implementation and documentation differ, update the documentation or request clarification.

Never allow the implementation to drift from the documented contract.

---

## Where to put new code

### Backend — ask yourself:

- "Is this a business concept (entity, rule, status)?" → **Domain**
- "Is this what the app can *do* (use case, validation, DTO)?" → **Application**
- "Does this talk to a database, file, or external API?" → **Infrastructure**
- "Is this HTTP-specific (route, controller, middleware)?" → **API**

---

## Development commands

```bash
# Backend only (from root)
dotnet run --project backend/ledger12.API

# Run backend tests
cd backend && dotnet test

# Add a new EF Core migration
cd backend && dotnet ef migrations add <MigrationName> \
  --project ledger12.Infrastructure \
  --startup-project ledger12.API

# Apply migrations
cd backend && dotnet ef database update \
  --project ledger12.Infrastructure \
  --startup-project ledger12.API
```

---

## Coding conventions

### Backend (C#)
- Follow standard C# naming: `PascalCase` for types and members, `camelCase` for locals and parameters, `_camelCase` for private fields.
- Use `record` types for DTOs (they are immutable by design).
- Use `async`/`await` throughout — no `.Result` or `.Wait()`.
- All controller actions must return typed `ActionResult<T>`, not `IActionResult` alone.
- All public service methods must have a corresponding interface in `Application/Interfaces/`.
- Validation lives in `Application/Validators/` using **FluentValidation** — never validate in controllers.
- Never catch generic `Exception` in business logic. Let `ExceptionMiddleware` handle it.
- Use `NotFoundException` for missing entities, `DomainException` for rule violations.
- Connection strings and secrets go in `appsettings.Development.json` (git-ignored) or environment variables — never hardcoded.
- **The build must produce zero warnings (CS, NU, or any other category). Every warning must be resolved before committing — never suppress warnings with `#pragma warning disable` unless explicitly instructed.**

---

## API Implementation Rules

* Implement endpoints exactly as documented in `API.md`.
* Route names, payload shapes, and status codes come from `API.md`.
* Do not rename endpoints during implementation.
* Do not introduce undocumented fields into responses.
* Do not remove documented fields from responses.
* Do not change status codes without updating the contract.

The backend implements the contract.

The `API.md` defines the contract.

--- 

## Modification Rules

Before creating new code:

1. Search for an existing implementation.
2. Prefer extending existing use cases.
3. Reuse existing domain concepts.
4. Reuse existing validators where possible.
5. Reuse existing exception types.

Avoid:

* duplicate entities
* duplicate repositories
* duplicate DTOs
* duplicate validators
* duplicate business rules

---

## Testing rules

- Every new **service method** in `Application` needs at least one unit test.
- Unit tests go in `ledger12.Tests/Unit/`, integration tests in `ledger12.Tests/Integration/`.
- Test class name mirrors the class under test: `AccountService` → `AccountServiceTests`.
- Test method name format: `MethodName_ExpectedBehaviour_WhenCondition`.
  - Example: `DepositAsync_IncreasesBalance_WhenAmountIsPositive`
- Use **Moq** for mocking. Never mock the class under test — only its dependencies.
- Do not test EF Core internals. Use the in-memory provider or a test database for integration tests.

---

## Things agents must never do

- **Never delete migrations** — add a new migration instead.
- **Never modify `AppDbContext` model without adding a migration.**
- **Never change the solution's project references** without explicit instruction.
- **Never add a NuGet or npm package** without stating what it's for and getting confirmation.
- **Never expose secrets** — check that `.gitignore` covers `appsettings.Development.json` and `.env` before committing.
- **Never return raw `Exception` messages** to the frontend — only controlled error shapes.
- **Never write business logic in a controller** — controllers only call services and return results.
- **Never write SQL strings directly** — use EF Core LINQ queries or parameterized raw SQL via `FromSqlRaw`.

* Never modify API contracts without updating `API.md`.
* Never implement undocumented endpoints.
* Never return Domain entities from controllers.
* Never place business rules in controllers.
* Never place business rules in EF configurations.
* Never bypass validation.
* Never access Infrastructure directly from API controllers.
* Never duplicate an existing use case.
* Never introduce circular project dependencies.
* Never use `dynamic` when a typed model can be used.


