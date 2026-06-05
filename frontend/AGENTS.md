# AGENTS.md

Guidance for LLM agents working on the **ledger12** frontend.
Read this file fully before making any changes.

---

## Project overview

**ledger12** is a financial ledger application with:
- **Backend** — ASP.NET Core Web API, Clean Architecture, Entity Framework Core
- **Frontend** — React 18, Vite, TypeScript, Vitest

```
MyApp/
├── backend/          # .NET solution (ledger12.sln)
│   ...
├── frontend/         # Vite + React + TS
│   └── src/
│       ├── pages/
│       ├── services/
│       ├── store/
│       ├── hooks/
│       ├── types/
│       └── components
|            ├── common/
│            └── ui/  # shadcn components
├── AGENTS.md
└── README.md
```

---

## Architecture rules — never violate these

### Feature-first organization

Business functionality belongs in `features/<domain>/`.

Example:

```text
features/
├── auth/
├── accounts/
├── transactions/
└── reports/
```

A feature may contain:

```text
features/accounts/
├── components/
├── hooks/
├── services/
├── types/
└── pages/
```

Do not place domain-specific code in shared folders.

---

### Shared vs feature-specific code

Use shared folders only when code is genuinely reusable across multiple domains.

Good:

```text
components/common/Button.tsx
components/common/Modal.tsx
```

Bad:

```text
components/common/AccountBalance.tsx
```

The latter belongs in:

```text
features/accounts/components/
```

---

### Data flow

Data should flow:

UI → Hook → Service → API

Components should not call API services directly when non-trivial state management is involved.

---

### State ownership

Prefer the smallest possible scope.

Order of preference:

1. Component state (`useState`)
2. Feature hook state
3. URL/search params
4. Zustand global state

Do not put state in Zustand unless it must be shared across multiple unrelated parts of the application.

---

### Server state

Backend data is server state.

Do not duplicate server state in Zustand.

Use the designated data-fetching mechanism (React Query if adopted, otherwise custom hooks).

---

### Dependency direction

Allowed:

```text
features → services
features → components/common
pages → features
```

Not allowed:

```text
components/common → features
services → components
```

Shared layers must never depend on feature layers.

---

### Separation of concerns

Components:
- rendering
- event wiring
- presentation

Hooks:
- state management
- orchestration
- business workflows

Services:
- HTTP requests
- DTO mapping
- API integration

Never place API logic inside React components.

---

## Where to put new code

### Frontend — ask yourself:

- "Is this reusable with no business logic?" → `components/common/`
- "Is this a page layout element (navbar, sidebar)?" → `components/layout/`
- "Is this domain-specific (auth, products, transactions)?" → `features/<domain>/`
- "Is this a route-level component?" → `pages/`
- "Is this an HTTP call to the backend?" → `services/`
- "Is this shared state?" → `store/`
- "Is this a reusable hook?" → `hooks/`
- "Is this a shared TypeScript type?" → `types/`

### Before creating a new folder

Check whether an existing feature already owns the functionality.

Prefer extending an existing feature over creating a new top-level feature.

Avoid:

```text
features/account-list/
features/account-details/
features/account-edit/
```

Prefer:

```text
features/accounts/
```

with subfolders inside.
---

## Development commands

```bash
# Build the frontend
cd frontend && npm run build

# Frontend only (from root)
npm run dev --prefix frontend

# Run frontend tests
cd fontend && npm run test
```

---

## Coding conventions

### General
- Use **English** for all code, comments, and commit messages.
- No commented-out code. Delete it.
- No `TODO` comments left in committed code — either implement it or open a task.

- One component per file. File name matches the component name exactly.
- Components are **function components** only — no class components.
- All API calls go through `services/api.ts` (the Axios base instance) — never call `fetch` directly in a component.
- Keep components free of business logic. Logic belongs in custom hooks or `features/<domain>/`.
- Use `const` by default — `let` only when reassignment is necessary.
- Tailwind only — no inline `style={{}}` beyond trivial cases.
- Never store sensitive data (tokens, keys) in `localStorage` — use `httpOnly` cookies via the API.
- Use Zustand to manage app state.

### UI

- Use shadcn/ui components whenever an equivalent component exists.
- Do not create custom replacements for existing shadcn components.
- Reuse existing design tokens and Tailwind utilities.
- Keep styling consistent with existing application patterns.
- Avoid hard-coded colors, spacing, and typography values when design tokens exist.

### React

- Keep components focused and small.
- Extract repeated JSX after the second occurrence.
- Avoid prop drilling beyond two levels.
- Prefer composition over deeply nested conditional rendering.
- Memoization (`useMemo`, `useCallback`) only when profiling or clear rerender concerns justify it.
- Effects should synchronize with external systems, not perform derived-state calculations.
- Derived state belongs in render logic, not in `useEffect`.

### TypeScript

- Prefer `type` over `interface` unless declaration merging is required.
- Export explicit types for all public APIs.
- Avoid type assertions (`as`) unless unavoidable.
- Never use `any`.
- Prefer discriminated unions over boolean state flags.
- Prefer readonly data structures where practical.
- All service responses must be strongly typed.

#### Mocking
- Mock handlers live in `src/mocks/handlers.ts`
- Every endpoint in `API.md` should have a corresponding handler
- Do not add mock logic inside service/api files
- MSW is only active in dev mode (`import.meta.env.DEV`)

---


## API Contract Development Rules

### Source of truth

`API.md` is the authoritative API contract between frontend and backend.

The frontend may be developed before the backend exists.

When implementing new functionality:

1. Check whether the required endpoint already exists in `API.md`.
2. If it exists, use it exactly as documented.
3. If it does not exist, the agent may propose and add a new endpoint to `API.md`.

---

### Frontend-first API design

When creating a new feature:

* Design the API from the perspective of frontend needs.
* Prefer simple RESTful resource-oriented endpoints.
* Minimize request count required by the UI.
* Avoid over-engineering for hypothetical future requirements.

The workflow is:

Feature → API Contract → Mock Handler → UI → Backend Implementation

---

### When adding a new endpoint

The agent may:

* Add endpoint definitions to `API.md`
* Add request/response DTOs
* Add example payloads
* Add corresponding MSW handlers
* Add frontend service methods

The agent must also update all affected documentation.

---

### Required API documentation format

Each endpoint should include:

* HTTP method
* Route
* Purpose
* Request body (if applicable)
* Response body
* Error responses
* Example payloads

Example:

```md
## Create Account

POST /api/accounts

Creates a new account.

Request:

{
  "name": "Checking",
  "currency": "USD"
}

Response (201):

{
  "id": "acc_123",
  "name": "Checking",
  "currency": "USD",
  "balance": 0
}
```

---

### Mocking requirements

Every endpoint documented in `API.md` must have a corresponding MSW handler.

When a new endpoint is added:

1. Update `API.md`
2. Add MSW handler
3. Add service method
4. Update frontend types

The mock implementation should behave as closely as possible to the documented contract.

Do not implement undocumented endpoints.

---

### Backend independence

Frontend development must not depend on backend implementation details.

Do not inspect backend controllers, EF models, DTOs, or database schema to design APIs.

`API.md` is the contract.

The backend should later implement the contract defined in `API.md`.

---

### Contract evolution

Agents may modify existing endpoints when:

* The feature is still under development.
* The change improves usability or consistency.
* All affected frontend code and mocks are updated.

When changing an existing endpoint:

* Update `API.md`
* Update all MSW handlers
* Update all affected TypeScript types
* Update all affected services

The contract and implementation must remain synchronized.

---

## Testing rules

- Use Vitest for unit tests.
- Use React Testing Library for component tests.
- Test behavior, not implementation details.
- Avoid testing internal state.
- Prefer user-visible assertions.
- Mock network requests using MSW.
- New business logic should include tests.
- Bug fixes should include regression tests where practical.

Naming:

```text
ComponentName.test.tsx
useAccounts.test.ts
accountService.test.ts
```
---

## Modification rules

Before creating new code:

1. Search for an existing implementation.
2. Prefer modifying existing code over creating parallel implementations.
3. Reuse existing patterns from the same feature.
4. Match local conventions before introducing new abstractions.

Avoid:
- duplicate hooks
- duplicate API clients
- duplicate utility functions
- duplicate UI components

---

## Things agents must never do

- Never add npm packages without approval.
- Never change API contracts without updating API.md.
- Never implement an endpoint that is not documented in API.md.
- Never allow API.md, MSW handlers, and TypeScript types to drift out of sync.
- Never disable TypeScript checks.
- Never use `any`.
- Never bypass linting by suppressing warnings without explanation.
- Never introduce a second state-management solution.
- Never duplicate existing functionality.
- Never commit secrets, tokens, or credentials.
- Never modify generated files unless explicitly instructed.

