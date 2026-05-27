# AGENTS.md

Guidance for LLM agents working on the **ledger12** codebase.
Read this file fully before making any changes.

---

## Project overview

**ledger12** is a financial ledger application with:
- **Backend** — ASP.NET Core Web API, Clean Architecture, Entity Framework Core
- **Frontend** — React 18, Vite, TypeScript

```
MyApp/
├── backend/          # .NET solution (ledger12.sln)
│   ├── ledger12.API/
│   ├── ledger12.Application/
│   ├── ledger12.Domain/
│   └── ledger12.Infrastructure/
├── frontend/         # Vite + React + TS
│   └── src/
├── AGENTS.md
└── README.md
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

---

## Where to put new code

### Backend — ask yourself:

- "Is this a business concept (entity, rule, status)?" → **Domain**
- "Is this what the app can *do* (use case, validation, DTO)?" → **Application**
- "Does this talk to a database, file, or external API?" → **Infrastructure**
- "Is this HTTP-specific (route, controller, middleware)?" → **API**

### Frontend — ask yourself:

- "Is this reusable with no business logic?" → `components/ui/`
- "Is this a page layout element (navbar, sidebar)?" → `components/layout/`
- "Is this domain-specific (auth, products, transactions)?" → `features/<domain>/`
- "Is this a route-level component?" → `pages/`
- "Is this an HTTP call to the backend?" → `services/`
- "Is this shared state?" → `store/`
- "Is this a reusable hook?" → `hooks/`
- "Is this a shared TypeScript type?" → `types/`

---

## Development commands

```bash
# Start both frontend and backend (from root)
npm run dev

# Backend only (from root)
dotnet run --project backend/ledger12.API

# Frontend only (from root)
npm run dev --prefix frontend

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

### General
- Use **English** for all code, comments, and commit messages.
- No commented-out code. Delete it.
- No `TODO` comments left in committed code — either implement it or open a task.

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

### Frontend (TypeScript / React)
- **Strict TypeScript** — no `any`. If the type is unknown, use `unknown` and narrow it.
- One component per file. File name matches the component name exactly.
- Components are **function components** only — no class components.
- All API calls go through `services/api.ts` (the Axios base instance) — never call `fetch` directly in a component.
- Keep components free of business logic. Logic belongs in custom hooks or `features/<domain>/`.
- Use `const` by default — `let` only when reassignment is necessary.
- Tailwind only — no inline `style={{}}` beyond trivial cases.
- Never store sensitive data (tokens, keys) in `localStorage` — use `httpOnly` cookies via the API.
- Use Zustand to manage app state.

- **Do NOT scan the backend project** to discover endpoints
- All available endpoints are documented in `API.md` — treat it as the source of truth
- If a needed endpoint is missing from `API.md`, ask the user rather than inferring
- Use the base URL from `API.md`; read it from `VITE_API_BASE_URL` env var at runtime

---

## API design conventions

- REST endpoints follow: `GET /api/accounts`, `POST /api/accounts`, `GET /api/accounts/{id}`, etc.
- Use **nouns** for resources, never verbs (`/api/accounts/deposit` is wrong — use `POST /api/accounts/{id}/transactions`).
- Return `201 Created` with a `Location` header for POST, `204 No Content` for DELETE/PUT with no body.
- All error responses use this shape:
  ```json
  { "error": "Human-readable message" }
  ```
- Paginated list responses use:
  ```json
  {
    "items": [...],
    "totalCount": 100,
    "page": 1,
    "pageSize": 20
  }
  ```

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

## Git conventions

- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`
- Commit message format (Conventional Commits):
  ```
  feat(accounts): add deposit endpoint
  fix(auth): handle expired token edge case
  chore(deps): update EF Core to 8.0.5
  ```
- One logical change per commit — do not bundle unrelated changes.
- Never commit directly to `main`.

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

---

## When you are unsure

If a task is ambiguous, ask one focused question before proceeding. Prefer doing less and confirming over doing more and breaking things. When in doubt about layer placement, default to the stricter interpretation (put it further inward).