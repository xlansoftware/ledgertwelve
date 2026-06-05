# AGENTS.md

Repository-wide guidance for LLM agents working on **ledger12**.

Read this file first.

---

## Repository structure

```text
MyApp/
├── AGENTS.md
├── frontend/
│   ├── AGENTS.md
│   └── API.md
└── backend/
    └── AGENTS.md
```

---

## Instruction hierarchy

This file contains repository-wide rules.

Additional rules exist in subprojects:

* `frontend/AGENTS.md`
* `backend/AGENTS.md`

When working in a subproject, read the corresponding AGENTS.md before making changes.

### Frontend work

If the task affects:

* React components
* Vite configuration
* TypeScript code
* frontend tests
* frontend services
* frontend mocks
* API contract design (`API.md`)

Read and follow:

```text
frontend/AGENTS.md
```

### Backend work

If the task affects:

* ASP.NET Core
* Application layer
* Domain layer
* Infrastructure layer
* EF Core
* database migrations
* backend tests

Read and follow:

```text
backend/AGENTS.md
```

### Cross-cutting work

If a task affects both frontend and backend:

1. Read both AGENTS files.
2. Follow both sets of rules.
3. Preserve contract compatibility between the projects.

---

## API contract ownership

The API contract is documented in:

```text
frontend/API.md
```

This file is the authoritative contract shared by frontend and backend.

### Frontend responsibilities

Frontend agents may:

* design new endpoints
* evolve existing endpoints
* update request/response schemas
* update examples
* update mock handlers

When modifying the contract:

* update `API.md`
* update frontend types
* update frontend services
* update MSW handlers

### Backend responsibilities

Backend agents implement the contract documented in `frontend/API.md`.

Backend agents must not silently change:

* routes
* payload shapes
* status codes
* response schemas

If a contract change is necessary, update `API.md` and explain the reason.

---

## General coding standards

### Quality

* Prefer modifying existing code over creating duplicate implementations.
* Reuse established patterns before introducing new abstractions.
* Keep solutions simple and maintainable.
* Remove dead code instead of leaving it commented out.

### Documentation

When changing behavior, update relevant documentation.

Examples:

* `API.md`
* README files
* architecture documentation
* setup instructions

Documentation and implementation must remain synchronized.

### Testing

Changes should include appropriate automated tests whenever practical.

Bug fixes should include regression tests when feasible.

### Security

* Never commit secrets.
* Never hardcode credentials.
* Never expose sensitive configuration values.
* Use environment variables for secrets and environment-specific settings.

---

## Modification workflow

Before creating new code:

1. Search for an existing implementation.
2. Search for existing patterns.
3. Extend existing functionality when appropriate.
4. Avoid introducing parallel implementations.

Prefer consistency over novelty.

---

## Things agents must never do

* Never ignore the relevant subproject AGENTS.md.
* Never allow implementation and documentation to drift apart.
* Never introduce duplicate implementations of existing functionality.
* Never commit secrets, credentials, or tokens.
* Never add dependencies without explicit approval.
* Never make unrelated changes as part of the same task.
