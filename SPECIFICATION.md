# Project Specification: Ledger Twelve (Personal Financial Ledger)

> Reconstructed from repository artifacts. This document is implementation-agnostic: it
> describes intent, behaviour, contracts, and conventions rather than source code.

## Artifacts reviewed

**Reviewed**

- Repository-level documentation: root readme, agent guidance, environment examples,
  container orchestration, developer-container configuration, and editor/CI-less build
  scripts.
- API contract document (two byte-identical copies under the frontend and backend trees).
- Backend source: domain entities and enums, application request/response shapes,
  validation rules, service orchestration, repository query logic, persistence
  configuration, database migrations, authentication and rate-limiting code, background
  export processor, HTTP middleware, dependency-injection composition, EF Core model
  configuration, and the project manifests.
- Backend product requirement documents: API implementation, testing strategy, default
  data, legacy migration, and shared-book/global-share migration.
- Backend test project: 51 source files across unit and integration suites.
- Frontend source: routing, entry point, API client, per-domain HTTP services, the
  online/offline service-factory abstraction, Zustand stores, responsive layout, page
  components, insight/report computation utilities, import parsing/mapping/conversion,
  MSW mock handlers, and TypeScript configuration.
- Frontend product requirement documents: 20 feature PRDs.
- Frontend test project: 41 test files (Vitest + Testing Library).
- Repository history (recent commits, branch, remote) and repository hygiene files.
- Supporting artifacts: legacy-data migration console, tenant-boundary and auth tests,
  security-hardening issue backlog, and sample export/backup payloads.

**Unavailable or not determinable**

- No continuous-integration pipeline definition is present in the repository.
- No production telemetry, metrics, tracing, or alerting configuration is present.
- No deployment manifests beyond a single Docker Compose file and Dockerfiles.
- No database backup/retention policy is encoded in the repository.
- No accessibility audit, localization files, or formal performance budget exist.
- No `.http` request file is current (the checked-in one references obsolete routes).
- Package versions are those declared in manifests; no lock-step verification against
  running images was possible.

---

## 1. Executive Summary

**What it is.** Ledger Twelve is a self-hosted, multi-user personal-finance web
application. Users record expenses and income as transactions, classify them by
category, and organise them into named **books** — sub-ledgers such as "Main" or
"Vacation 2026". It is the successor to an earlier product (Ledger Eleven), for which a
dedicated one-way migration path exists.

**Who it is for.** Individual users who want a private, server-hosted ledger that works
well on a phone for quick entry and on a larger screen for analysis. A single deployment
serves several users; data is isolated per user, with explicit book-sharing between
users.

**What problem it solves.** Quick capture of day-to-day spending and income, organised
so that ad-hoc sub-budgets (a trip, a project) can be tracked separately, then closed and
folded back into a main ledger. It then answers "where did my money go, and what is the
trend?" through period trends, category breakdowns, running balances, and forward
projections.

**Current maturity.** Late-stage MVP trending toward production. The feature set is
broad (authentication, books, sharing, multi-currency, reporting/insights, asynchronous
export, partial-success import, full backup/restore, offline local-only mode, legacy
migration) and is covered by a substantial unit/integration test suite. A recent
security-hardening pass addressed tenant boundaries, authentication throttling, transport
hardening, error-message leakage, and debug seams. The application is deployed as a
containerised stack behind a reverse proxy and an optional tunnelling service. Notable
implementation/contract drift and a few functional defects remain (see §11), which is why
the maturity is described as "late MVP" rather than "hardened production".

---

## 2. Technology Stack

### Backend

| Concern | Choice |
|---|---|
| Runtime / framework | .NET 10, ASP.NET Core Web API |
| Language | C# with nullable reference types, implicit usings |
| Persistence | Entity Framework Core 10 over SQLite |
| Identity | ASP.NET Core Identity, cookie authentication |
| Validation | FluentValidation with automatic model-state integration |
| JSON | System.Text.Json (camel-case, enums as strings, nulls omitted) |
| Background work | In-process bounded channel plus a hosted background service |
| External service | HTTP client to a public foreign-exchange rate provider (Frankfurter) |
| Tests | xUnit, Moq, EF Core in-memory provider, SQLite for integration tests |
| Legacy migration | Separate .NET console executable reading legacy SQLite databases |

### Frontend

| Concern | Choice |
|---|---|
| Runtime / framework | React 19 (documentation still says 18), Vite 8, TypeScript ~6 |
| Routing | React Router (data-router API, browser history) |
| State | Zustand stores |
| UI system | Tailwind CSS 4, shadcn/ui components, Base UI primitives, CSS-variable theming |
| Charts | Recharts |
| Dates | date-fns |
| Animation | framer-motion |
| Toasts | sonner |
| Icons | lucide-react, plus a local icon registry |
| File parsing | PapaParse (CSV), ExcelJS (XLSX), native JSON |
| Dev/test mocking | Mock Service Worker (browser worker in dev, Node server in tests) |
| Tests | Vitest, React Testing Library, jsdom, fake-indexeddb |
| Offline storage | IndexedDB (native browser API) |

### Infrastructure & tooling

- **Containerisation:** multi-stage Dockerfiles for the API, the SPA, and the migration
  console. A single Compose file coordinates the SPA/reverse proxy, the API, the one-shot
  migration job, and an optional Cloudflare tunnel.
- **Serving:** nginx serves the built SPA, proxies the API, applies gzip and long-lived
  asset caching, and injects forwarded/proxy headers.
- **Data volume:** a named Docker volume holds the SQLite file and (in production) the
  ASP.NET data-protection key ring.
- **Developer environment:** a .NET 10 dev-container with Docker-in-Docker.
- **Build/lint/test scripts:** root npm scripts orchestrate backend build/test and
  frontend build/test; frontend linting is ESLint with TypeScript and React-hooks rules.
- **No CI pipeline is defined in the repository.**

---

## 3. Architecture Overview

### Backend — layered Clean Architecture

Dependencies point strictly inward through four layers:

```
HTTP layer  →  Infrastructure  →  Application  →  Domain
```

- **Domain** — pure business concepts: entities, enums, and the two exception types
  (a not-found exception and a general domain-rule exception). No framework references.
- **Application** — use-case orchestration, request/response records, service and
  repository interfaces, validation rules, and explicit mapping helpers. Depends only on
  Domain.
- **Infrastructure** — EF Core context and model configuration, repository
  implementations, identity user type, the current-user accessor, the login throttle, and
  the background export processor. Implements interfaces declared by Application.
- **HTTP layer** — controllers, exception middleware, forwarded-header handling, and
  dependency-injection composition. Controllers contain no business logic; they extract
  the current user and delegate to services.

**Rationale (inferred).** The inward-only dependency rule, repository interfaces in the
Application layer, DTOs that never expose entities, and the explicit prohibition on
infrastructure access from controllers together indicate a deliberate testability and
replaceability goal.

### Cross-cutting backend mechanisms

- **Authentication:** cookie-based with HTTP-only, SameSite=Lax cookies; secure flag
  mandatory outside development; seven-day sliding expiration; lockout after repeated
  failures.
- **Transport hardening:** HTTPS redirection and HSTS outside development; a restricted,
  semicolon-separated host allow-list is required outside development and a wildcard is
  rejected at startup.
- **CORS:** permissive in development; in non-development only explicitly configured
  origins, with credentials allowed.
- **Error handling:** a single exception-handling middleware maps not-found and
  domain-rule exceptions to client errors, validation failures to a flattened error
  message, and all other exceptions to a generic message with details logged server-side.
- **Validation:** request validators run automatically before controller actions; failures
  are flattened to a single human-readable error string.
- **Persistence:** repositories save on each mutation (no unit-of-work spanning a
  use case). The context converts all offset timestamps to UTC for storage because SQLite
  cannot order/group by offset values.
- **Background export:** creating an export writes a pending job and publishes its
  identifier onto an in-process channel; a hosted service consumes jobs, generates files,
  and updates job state.

### Frontend — feature-first with a swappable service factory

- **Organisation:** domain features live under a `features/<domain>` convention; shared,
  business-free UI lives under shared component folders. Routing pages compose feature
  components.
- **Data flow (documented intent):** UI → hook → service → API. Components should not
  perform non-trivial data fetching themselves.
- **Service strategy:** a single factory object exposes per-domain service interfaces.
  Two concrete families implement those interfaces:
  - an **online** family that delegates to the HTTP client, and
  - an **offline** family backed by IndexedDB.
  The factory is selected at bootstrap based on a locally persisted mode flag. Domain
  code always resolves the active factory, never a concrete implementation.
- **State:** Zustand stores hold server-derived reference data (books, categories, users,
  transactions, import workflow) and expose imperative actions. This contradicts the
  written guidance that server state should not be duplicated in global stores; in
  practice the stores act as the client-side cache and optimistic-update layer.
- **Auth state:** an auth store models three states — unauthenticated, authenticated, and
  a local-only offline identity.
- **Bootstrap sequence:** render a spinner → detect offline mode (skip session check and
  mock worker) or start the dev mock worker → probe the session → prefetch reference data
  → render the router, with full-screen error/retry on failure.

### Deployment topology

```
Browser ──HTTPS──► Cloudflare edge ──tunnel──► nginx (SPA + /api reverse proxy)
                                                   │
                                                   ▼
                                            ASP.NET Core API ──► SQLite file (volume)
                                                   │
                                                   └── HTTPS ──► exchange-rate provider

One-shot console job ──► same SQLite volume (reads a bind-mounted legacy data folder)
```

---

## 4. Functional Specification

### 4.1 Authentication and identity

- Users register with email and password. Registration creates the account, seeds its
  default Main book and default category set, and signs the user in immediately.
- Login issues an HTTP-only session cookie. Response bodies never reveal whether an email
  exists: unknown email, wrong password, and locked account all return the same
  unauthorized response. Unknown-email requests still perform comparable password-hashing
  work to reduce timing-based enumeration.
- Logout clears the session cookie.
- A "who am I" operation returns the authenticated user.
- Password policy requires at least six characters with upper-case, lower-case, numeric,
  and non-alphanumeric characters (enforced by the identity provider; the exact message
  enumerates unmet requirements).
- Brute-force protection is two-layered: per-client request throttling in a fixed window,
  and per-account lockout after repeated failures for a fixed interval. Both are described
  in the contract.
- All non-auth endpoints require an authenticated session.

### 4.2 Default data

- The first time a user is initialised, the system idempotently ensures a book named
  "Main" exists (base currency EUR) and that the user has the standard catalogue of 22
  categories with fixed names, order, colours, icons, and recurring flags.
- Seeding is skipped entirely if the user already has any categories, so user
  customisations survive; the Main book is recreated only if absent.
- A development-only seed creates a demo account with a known credential, its Main book,
  and its default categories. This seed is intentionally disabled outside development.

### 4.3 Books (sub-ledgers)

- A user always has at least one book; a Main book is created on registration.
- Users create books with a name and optional ISO currency. Every book records its owner,
  creation time, status (open/closed), and sharing list.
- Listing returns books the user owns or is shared into. Fetching, updating, deleting,
  closing, and reopening are owner-restricted (fetching/visibility is also granted to
  sharees).
- A book's metadata can be updated (name and currency). Changing currency does not
  retroactively convert existing transaction values.
- Deletion is refused for the Main book and for any book that contains transactions.
- **Statistics:** a read-only summary exposes a transaction count and net sum, excluding
  auto-generated book-closing entries. An optional as-of date restricts the computation to
  transactions before the day after that date (end-of-day inclusive).
- **Current book:** the app persists the user's selected book as a preference. If none is
  stored, the earliest visible book is returned. Selecting a current book validates
  visibility.
- **Closing a book:** closing requires a category name, computes the net sum of the book,
  writes a balancing transaction into the Main book (negative/positive as appropriate),
  sets the note to "Close <book name>", tags the entry as a closing entry with a
  back-reference to the closed book, and marks the book closed. Closing an already-closed
  book is rejected; the Main book cannot be closed.
- **Reopening:** clears the closed status and timestamp. The balancing transaction in Main
  is left untouched; adjusting it is the user's responsibility.
- **Stats on closed books** are used by the UI to show the residual balance in the closed
  list.

### 4.4 Sharing

- **Per-book sharing:** the owner can add a registered user by email with a view or edit
  permission, change that permission, or remove it. Self-sharing and duplicate shares are
  rejected.
- **Global sharing:** the owner can grant another registered user edit access to *all* of
  the owner's books, including books created later. Removing a global share revokes the
  user from every owned book. Global sharing is explicitly edit-only; view-only global
  sharing is documented as a future extension.
- When a new book is created, existing global sharees are automatically attached with edit
  permission.
- Visibility semantics: owners and sharees can read; only owners (and edit sharees for
  transactions/imports) can mutate.

### 4.5 Categories

- Categories are user-scoped and shared across all of that user's books.
- Each category has a name, optional recurring marker, optional colour, optional icon, and
  an explicit display order.
- Full CRUD is supported. Deleting a category may optionally reassign its historical
  transactions to another category by name; otherwise the category simply disappears from
  selection while historical transactions keep the old category name.
- Bulk reassignment moves all transactions from one category name to another within the
  user's visible books.
- Reordering accepts the complete ordered list of the user's category identifiers and
  applies sequential positions.
- Category names are unique per user (enforced at the database level). Transactions
  reference categories by denormalised name, not by foreign key — a deliberate historical
  design that keeps deleted categories readable.

### 4.6 Transactions

- A transaction records an occurrence timestamp, a signed amount (negative = expense,
  positive = income), optional original currency amount and exchange rate, an optional
  category name, an optional note, the owning book, the creating user, a creation
  timestamp, and closing-entry metadata.
- Create/update validate that, when an original currency is supplied, both the original
  amount and an exchange rate are present.
- Search supports filtering by book, inclusive-from/exclusive-to date range, repeated
  category names (OR), repeated creator identifiers (OR), case-insensitive note substring,
  inclusive minimum and maximum amount, and pagination. Results are sorted newest-first
  and always scoped to books the caller can see; requesting an invisible book yields
  not-found.
- Deletion is allowed. Amount edits do not automatically recompute exchange rates.
- Mutation requires edit access to the transaction's book.

### 4.7 Reporting and insights

All reporting is derived **only from the user's Main book** (closing entries already flow
into Main).

- **Totals by period** (day, week, month by default, or year): income, expense, and net
  per period, optionally date-bounded, sorted ascending by period key.
- **Category breakdown:** net amount per category over an optional date range, ordered by
  absolute magnitude, rounded to two decimals.
- **Daily net series:** day-keyed net amounts over a required range, ascending, empty days
  omitted.
- **Monthly net series:** month-keyed net amounts over a required range, ascending, empty
  months omitted.
- **Average daily / average monthly:** sum of period nets divided by the count of periods
  that actually contain transactions (empty periods are excluded from the divisor),
  rounded to two decimals.
- **Client-side insight composition:** the daily insight places the selected day's
  category breakdown beside a running balance for the current month, seeded by the
  previous month's closing balance, and projects forward to month-end using a rolling
  twelve-month average (falling back to a short-window slope). The monthly insight offers
  year navigation, month selection, per-year stats for completed years, and forward
  projection only for the current year.

### 4.8 Exchange rates

- A lookup returns a suggested rate between two currency codes, fetched live from the
  external provider. The endpoint is unauthenticated and case-insensitive.
- Any failure (missing codes, unknown currency, provider error) surfaces as a client
  error.
- The rate is a *suggestion*: the user can always override both the rate and the converted
  amount in the conversion dialog.

### 4.9 Export (asynchronous)

- Creating an export accepts an optional format (CSV, XLSX, JSON), a content type, and a
  book identifier when exporting transactions. The response returns a job identifier.
- Content types cover categories, transactions (per book), books, full backup, and six
  report variants (daily/monthly/yearly × total/per-category).
- Jobs move pending → processing → completed or failed. Completed jobs expose a download
  URL; failures expose a user-facing message while details are logged.
- Backup is always JSON and includes an export timestamp, a schema version, and arrays of
  books, categories, and transactions.
- Download filenames follow documented conventions, including a sanitised book-name
  segment for transaction exports. The generator enforces that the resolved output path
  stays inside the configured export directory.
- The client polls job status until completion or failure, then downloads the blob.

### 4.10 Import (partial success)

- Import is deliberately **not all-or-nothing**: valid rows are committed, invalid rows
  are skipped and reported.
- Two modes: **preview** (validate and report what would change; commit nothing) and
  **commit**.
- Three single-entity targets (transactions, categories, books) plus a special **backup**
  restore mode. Parsing and column mapping happen entirely client-side; the server
  receives already-typed rows.
- Transactions require a fallback book that the caller can edit. Row-level book overrides
  are accepted only if editable. Multi-currency rows must carry both original amount and
  rate.
- Categories require a name; books require a name with optional currency and status.
- An identifier field controls upsert-versus-create; empty identifiers always create.
  `clearExisting` deletes pre-existing records of the target type first (transactions
  scoped to the target book) and is ignored in preview except that the response reports
  the would-be deletion count.
- Backup restore validates the version (currently 1), then processes books → categories →
  transactions, merging by identifier and — per the contract — never clearing books.
- Every issue carries a 1-based row index, an optional field name, a message, and a
  severity (`error` skips the row; `warning` still processes it).
- All import targets require edit access; view-only shares are rejected.

### 4.11 Offline / local-only mode

- A locally persisted mode flag toggles the app between online and offline operation.
- In offline mode the app skips the session check and the dev mock worker, generates or
  reuses a local user identity, seeds a Main book and the default categories into
  IndexedDB, and routes all domain operations through IndexedDB-backed services.
- Offline parity covers books (including close/reopen and locally stored shares),
  categories, transactions, reports, exports, and imports. Global sharing is explicitly
  unsupported offline.
- Switching modes performs a full page reload. There is no synchronisation between the
  offline store and the server (the mode is a separate local sandbox, not an offline-first
  cache).

### 4.12 Legacy migration (Ledger Eleven → Ledger Twelve)

- A standalone console job migrates users, spaces (books), memberships (shares), global
  shares, categories, transactions, and the user's current-space preference from an older
  data folder containing a main database plus per-space databases.
- The job is destructive by design: it drops the target database, applies migrations, then
  imports. It preserves user credentials and identities, maps old spaces to books, deduplicates
  categories per user, resolves category references by name, and routes transactions into
  the correct Main book.
- It resolves its connection string through a documented precedence order (CLI,
  environment variable, API settings file, default) and accepts a data-directory argument.
- The Compose setup exposes the job only under an opt-in profile.

---

## 5. Data Model

### 5.1 Entities and relationships

- **User** — identity account: identifier, email, username, password hash, security
  fields, lockout counters. Identity-related tables and roles come from the framework.
- **Book** — identifier, name (max 200), optional currency (max 10), status (open/closed,
  stored as text), owner identifier, creation timestamp, optional closed timestamp, and a
  collection of shares. Indexed by owner.
- **BookShare** — composite key (book, user); a permission (view/edit) stored as text;
  cascade-deletes with its book.
- **GlobalShare** — composite key (owner, shared-with user) plus creation timestamp.
- **Category** — identifier, name (max 200), recurring flag, optional colour (max 20),
  optional icon (max 100), integer display order (default 0), owner user, creation
  timestamp. Unique on (user, name); indexed by user.
- **Transaction** — identifier, book, creating user, occurrence timestamp, amount
  (decimal 18,2), optional original currency (max 10), optional original amount
  (18,2), optional exchange rate (18,6), optional category name (max 200), optional note
  (max 2000), creation timestamp, closing-entry flag, and optional closed-book
  back-reference. Indexed by book, user, timestamp, and category. The book relationship
  restricts deletion.
- **UserPreference** — keyed by user; holds the optional current book identifier.
- **ExportJob** — identifier, status (pending/processing/completed/failed), format
  (csv/xlsx/json), content type, optional book, owning user, optional file path, optional
  error message, creation timestamp.
- **CurrencyRate** — composite key of currency pair, decimal rate (18,6), update
  timestamp. Defined and persisted but never read or written by current application code
  (dead domain concept).

**Relationship summary:** a user owns many books and categories; a book has many
transactions and many shares; a share links one book to one user; a global share links two
users; a user has at most one preference row; an export job belongs to one user and
optionally one book. Transactions reference categories and books by name/identifier
rather than through a category foreign key.

### 5.2 Storage and rationale

- Single-file **SQLite** through EF Core, chosen for zero-admin self-hosting.
- Offset timestamps are converted to UTC for storage to work around SQLite's inability to
  order/group by offset values.
- Automatic migration + development seed run at application startup.
- Two migrations exist: the initial schema and a follow-up introducing the timestamp
  converters.

### 5.3 Lifecycle, retention, privacy

- Deleting a book cascades to its shares; transaction deletion is restricted at the
  database level, so non-empty books cannot be deleted.
- Deleting a category leaves historical transactions' category names intact.
- Full backup/restore and per-entity import/export are the data-portability mechanisms.
- The API contract explicitly places advanced encryption-at-rest and privacy tooling out
  of scope for the current definition; the deployment relies on the host/volume for
  at-rest protection.
- The development demo credential must never exist in non-development environments.

---

## 6. Interfaces

### 6.1 HTTP API conventions

- **Base path:** a single versioned prefix (`/api/v1`) for all resources.
- **Envelope:** successful single/list responses wrap payloads in a `data` property;
  transaction searches add a `meta` block with page, page size, and total.
- **Errors:** a flat JSON object with a single human-readable `error` string. Validation
  failures are flattened into the same shape.
- **Authentication:** cookie-based; all resources except registration, login, and exchange
  rates require a session.
- **Identifiers:** all entity identifiers are GUIDs serialized as strings. Contract
  examples use short human-readable placeholders for illustration only.
- **Date-range convention:** from is inclusive (`>=`), to is exclusive (`<`); as-of is
  inclusive with end-of-day semantics implemented as a next-day exclusive bound.
- **Pagination:** page size defaults to 50; search exposes page and page size.
- **No idempotency keys, rate-limit headers (other than login retry-after), ETags, or
  conditional requests** are defined.

### 6.2 Endpoint surface by capability

| Capability | Operations |
|---|---|
| Authentication | register, login, logout, current identity |
| Users | list users the caller has interacted with (self + collaborators) |
| Categories | list, create, update, delete (optional replacement), bulk reassign, reorder |
| Books | list visible, get, create, update, delete, get/set current, statistics, close, reopen |
| Per-book sharing | add sharee, update permission, remove sharee |
| Global sharing | add global share (all owned books), remove global share |
| Exchange rates | look up a suggested rate between two currency codes |
| Transactions | search (filters + pagination), get one, create, update, delete |
| Reports | totals by period, category breakdown, daily, monthly, average daily, average monthly |
| Exports | create job, poll status, download result |
| Imports | single-entity or backup import, preview or commit |

### 6.3 CLI / SDK / events

- **CLI:** the legacy migration console (arguments for connection string and data
  directory, documented precedence, destructive one-shot semantics).
- **SDK:** none. The only client is the bundled SPA.
- **Events/webhooks:** none. Export completion is poll-based.
- **Dev/test contract stub:** MSW handlers implement every documented endpoint, provide
  deterministic in-memory data, and a seeded test session. MSW is active only in
  development and tests.

### 6.4 Versioning and compatibility

- Only `/api/v1` exists. No formal deprecation/sunset policy is encoded.
- The API contract document is the authoritative cross-project contract; backend and
  frontend agents are required to keep implementation, types, mock handlers, and the
  contract synchronised.

---

## 7. User Interface Specification

### 7.1 Screen inventory

| Route area | Screen | Purpose |
|---|---|---|
| `/login` | Login | Email/password sign-in; also the offline-mode entry point. |
| `/` (index) | Responsive dashboard | Single/multi-pane composition of Add + History (+ Daily Insight). |
| `/add` | Add transaction | Quick amount entry, category picker, note, currency conversion. |
| `/history` | History | Grouped, paged transaction list with filtering. |
| `/edit-transaction/:id` | Edit transaction | Full edit of an existing transaction. |
| `/books` | Book list | Open/closed books, current-book selection, closed-book balances. |
| `/books/new` | Create book | Name + optional currency. |
| `/edit-book/:id` | Edit book | Metadata, statistics, close/reopen/delete. |
| `/categories` | Categories | Add, edit, delete-with-replacement, reorder. |
| `/shares` | Shared users | Manage global shares. |
| `/settings` | Settings | Account, mode switch, theme, navigation to books/categories/shares/export/import. |
| `/export` | Export | Choose content/format/book/report options; poll and download. |
| `/import`, `/import/mapping`, `/import/preview` | Import wizard | Upload, map columns, preview, commit. |
| `/insight` | Insight overview | Daily/monthly/yearly category donut summaries for the current year. |
| `/insight/daily` | Daily insight | Month running balance, daily list, projection, donut. |
| `/insight/monthly` | Monthly insight | Year navigation, monthly running balance, projection, donut. |
| `*` | Not found | 404 fallback. |

A placeholder home component exists but is not routed (dead UI).

### 7.2 Navigation and information architecture

- A responsive header switches between a desktop tab bar and a mobile bottom bar.
- Primary destinations: Add, History, Insight, Settings; Books is desktop-visible and
  reachable from Settings on mobile.
- Login is a sibling of the app shell (no chrome). All other routes render inside the
  shell with an authentication guard that redirects unauthenticated users to login.
- Books, editing, export, import, categories, and sharing are secondary routes reached
  from Settings or from list screens.

### 7.3 Component patterns and design system

- shadcn/ui components on top of Base UI primitives; Tailwind utilities with CSS-variable
  design tokens for light/dark themes; Inter variable font.
- A responsive component layer chooses modal-versus-bottom-sheet based on viewport width
  (for example, the conversion dialog).
- Reusable patterns: confirm-dialog provider, success-overlay provider (with optional
  sound), skeleton loaders, empty states, error banners with retry, combobox multi-select,
  calendar date pickers, chart wrappers, status badges, and a category/icon/colour picker.
- Theme is light/dark/auto via a theme provider and toggle.
- Currency display and expense formatting helpers are shared; category colours drive row
  accents with computed contrast text.

### 7.4 Responsiveness

The dashboard progressively composes panes: narrow screens show only Add; medium screens
show Add + History side by side; wide screens add a third Insight pane. Mobile uses a
bottom navigation bar and bottom sheets.

### 7.5 Accessibility, internationalization, interaction states

- Semantic labels and `aria-label` attributes are present on key controls; the app is not
  evidenced to have undergone a formal audit.
- **No localization or i18n framework is present.** All copy is English. User-visible
  dates use the browser locale; currency input accepts inline currency symbols.
- Interaction states are handled consistently: loading skeletons/spinners, explicit empty
  states, error banners with retry, success toasts/sounds, and disabled/busy button
  labels. Optimistic updates are used in stores with rollback on failure.

---

## 8. Testing Strategy

### 8.1 Levels present

- **Backend unit tests** — domain entities, all application services with mocked
  repositories, validators, mapping helpers, export generation, import validation/commit,
  and the login throttle.
- **Backend integration tests** — repository queries against a real/in-memory database,
  default-data seeding, login lockout, transaction service, and explicit tenant-boundary
  suites for exports and imports.
- **Frontend unit/component tests** — services (HTTP client against MSW), stores, hooks,
  pure insight/report utilities, import parser/mapper/converter, offline IndexedDB
  services, and representative page/component tests.
- **Contract stubs** — MSW handlers cover the documented API surface for both browser dev
  and Node tests.

### 8.2 Tooling and fixtures

- Backend: xUnit with a naming convention mirroring the class under test and a
  `Method_ExpectedBehaviour_WhenCondition` pattern; Moq for dependencies; fixed timestamps
  for determinism.
- Frontend: Vitest + React Testing Library + jsdom; fake-indexeddb for offline tests;
  `matchMedia` polyfilled; MSW server for all service tests; a seeded session cookie
  injected at the fetch layer.
- Seed/test data includes deterministic categories, demo users, and sample backup/import
  JSON fixtures.

### 8.3 Coverage, gates, gaps

- No coverage thresholds or quality gates are configured. There is no CI pipeline; tests
  run only through local/root scripts.
- Frontend has no end-to-end or visual-regression tests.
- Backend has no HTTP-level end-to-end tests through the real auth pipeline (controller
  behaviour is largely covered indirectly).
- Known flaky/noisy area: act() warnings in React tests are explicitly suppressed as a
  known false positive.
- Export report variants, the XLSX path, and `clearExisting` deletion paths are not
  verified against the contract and are known to be incomplete (§11).

---

## 9. Quality Attributes

### Performance

- Intended to be lightweight (single SQLite file, small SPA). No explicit latency or
  throughput targets exist.
- Several report and export paths load full result sets into application memory before
  grouping, which will degrade on large ledgers.
- The yearly insight views request a full year of transactions in one large page.

### Scalability

- Vertical-only: single API process, in-process job queue, in-memory rate limiter, and a
  single SQLite writer. Not designed for horizontal scaling.
- User isolation is enforced by owner/share visibility filters and explicit tenant-boundary
  tests; the API is safe for multiple concurrent users on one instance.

### Security posture

- Cookie auth with HTTP-only, SameSite=Lax, secure-in-production cookies; seven-day
  sliding sessions.
- Login throttling (per client) plus account lockout; uniform failure responses and dummy
  hashing to resist enumeration; neutral responses for unknown/wrong/locked.
- Host allow-list required and wildcard rejected outside development; HTTPS redirection
  and HSTS outside development; CORS locked to configured origins outside development.
- Server-side validation via FluentValidation; generic client-facing 500 messages; input
  parsed rather than interpolated; export path traversal prevented.
- Known residual concerns: in-memory throttle state is per-instance and lost on restart;
  no CSRF token beyond SameSite cookies; no refresh-token rotation.

### Observability

- Structured logging through the standard logging abstraction with a warning on
  not-found/domain violations and an error with exception detail on unexpected failures.
- No metrics, tracing, dashboards, or alerts are configured. Export failures are logged;
  users see a generic message.

### Reliability

- Export jobs are processed in-process; there is no retry/backoff, dead-letter, or
  crash-recovery sweep for pending jobs (a restart can strand queued work).
- Partial-success import is an explicit reliability property.
- Graceful degradation in the UI: failed average/projection fetches silently fall back to
  a short-window estimate or zero seed; failed stats in the closed-books list leave a
  placeholder.
- No circuit breakers or retries around the external exchange-rate provider; failures
  degrade to a 400 response.

---

## 10. Developer Experience

### Onboarding and commands

- Root scripts provide: run backend, build backend, build frontend, test backend, test
  frontend, run both frontend and backend concurrently, and a combined build/test.
- Backend developers use the .NET CLI; EF Core migrations are added/applied via the
  infrastructure project with the API as startup project.
- Frontend developers use npm scripts for dev (with and without the mock worker), build,
  lint, preview, and test.
- Docker Compose starts the stack; a separate profile runs the destructive legacy
  migration job.

### Conventions

- **Backend:** PascalCase types/members, camelCase locals, underscore-prefixed private
  fields; immutable request/response records; async throughout; typed action results;
  interfaces for public service methods; validation in validators, not controllers;
  controllers free of business logic; no EF entities across layers; zero build warnings.
- **Frontend:** one component per file, function components only, English only, no
  commented-out code or TODOs, feature-first folder ownership, API calls only through the
  HTTP client, Tailwind-only styling, no `any`, strongly typed responses, discriminated
  unions, and MSW handlers kept in lock-step with the contract.
- The written guidance contains internal contradictions (declared React 18 vs actual
  React 19; a statement to use the Axios base instance followed by a statement to never
  use Axios; "don't duplicate server state in global stores" vs stores that do exactly
  that). The implemented reality is fetch-based HTTP and Zustand-hosted server state.

### Branching, release, versioning

- Default branch is `main` with a single remote. Commit history is informal and
  incremental. There is no tagged release, changelog, or semantic-versioning policy
  beyond a placeholder application version.
- The API is versioned only by URL prefix. The backup payload carries an explicit schema
  version.

### Documentation present

- Root readme (Docker deployment, migration steps, volumes, troubleshooting).
- Backend architecture readme, API contract, five PRDs, and an infrastructure note.
- Frontend architecture guidance, API contract, and 20 feature PRDs.
- Issue-tracker conventions and agent-skill definitions.
- Inline documentation is used where contract ambiguity matters (date-range semantics,
  security decisions, offline schema).

---

## 11. Acupuncture (Pain Points & Technical Debt)

Severity reflects impact on correctness, security, or maintenance effort.

### High

1. **XLSX exports are not actually XLSX.** The export generator produces CSV text for
   every non-JSON format but names and serves the file as a spreadsheet, with the
   spreadsheet MIME type. Users requesting a spreadsheet receive mislabeled CSV.
   *Root cause:* the XLSX writer was deferred in favour of a "structured CSV-as-XLSX"
   shortcut, and the shortcut was never completed or documented as a limitation.
   *Impact:* broken user expectation and a clear contract violation.

2. **Report export content types are stubs.** Selecting any report export produces a
   placeholder message rather than report data, regardless of requested format.
   *Root cause:* report export was descoped during implementation but left wired into the
   public contract and UI.
   *Impact:* advertised functionality silently fails.

3. **Single-entity `clearExisting` is a no-op.** The documented deletion-before-import
   behaviour is not implemented for transactions/categories/books; the deletion count is
   always zero.
   *Root cause:* a placeholder branch was left in the import path.
   *Impact:* data the user expects to be replaced accumulates; contract drift.

4. **Backup restore clears more than documented.** The contract states books are never
   cleared during backup restore and are merged by identifier; the implementation deletes
   all owned books (and their transactions/categories) before re-importing.
   *Root cause:* implementer chose a "clean restore" simpler than the contract.
   *Impact:* data loss for books owned by the user but absent from the backup; contract
   violation.

5. **Category reassignment-and-delete passes identifiers where names are expected.**
   The categories screen issues a reassignment using category identifiers for the
   from/to names, then deletes without the replacement name. Because transactions store
   category names, the reassignment silently affects zero transactions.
   *Root cause:* mismatch between the UI's identifier-based model and the API's
   name-based reassignment model.
   *Impact:* users lose category assignments when deleting categories while believing
   they were reassigned.

### Medium

6. **Contract/implementation drift in export column formatting.** The contract promises
   that human-readable exports replace foreign-key identifiers with display values (book
   name, user email, owner email) and that transaction JSON retains all fields; the
   implementation writes raw identifiers and omits some fields in JSON.
   *Impact:* consumers relying on the documented shape break silently.

7. **Blank sharee emails in book DTOs.** Book detail responses map share entries with an
   empty email placeholder. The frontend compensates by resolving emails from a separate
   users list, but any external consumer sees incomplete data.
   *Impact:* contract drift; fragile UI coupling.

8. **Reporting "net" vs "expense-only".** Daily and monthly report queries filter to
   negative amounts (expenses) while the contract describes net amounts. Income is
   therefore invisible in those series. This appears intentional for the spending-focused
   insight screens but is not reconciled with the contract.
   *Impact:* ambiguous semantics and misleading API documentation.

9. **In-memory user filtering.** One collaborator-lookup query loads all users and filters
   in memory rather than in the database.
   *Impact:* degrades as the user base grows.

10. **Main-book resolution by name and visibility.** Reports and closing logic locate the
    "Main" book by name among books visible to the caller. A sharee of someone else's Main
    book can have that book selected as their reporting source.
    *Root cause:* no explicit owner/main flag; the concept is name-based.
    *Impact:* cross-tenant reporting confusion; fragile if a user names a non-Main book
    "Main".

11. **Report aggregation in application memory.** Totals, category, and export paths load
    full transaction sets and group in memory rather than aggregating in the database.
    *Impact:* memory and latency risk on large ledgers.

12. **Large single-request yearly fetch.** Insight screens request up to 10,000
    transactions in one call for the current year.
    *Impact:* heavy payloads and slow first paint on large ledgers.

13. **Timezone inconsistency.** Some report grouping uses server-local date components
    wrapped as UTC, while store and insight logic mixes local and UTC date extraction.
    *Impact:* transactions near midnight can land in the wrong day/month.

14. **Export job durability.** Pending jobs live only in the in-process channel and the
    database; there is no startup recovery sweep, so a crash strands queued jobs as
    permanently pending.

15. **Client download filename mismatch.** The server derives transaction filenames from
    the book name, but the client overwrites the download name using the book identifier.
    *Impact:* inconsistent naming and a broken documented convention from the UI.

### Low

16. **Stale branding.** The shell header and document title still say "Ledger Eleven".
17. **Dead code**: an unused currency-rate entity/table, an unrouted placeholder home
    page, duplicate/unused repository methods, and duplicate aliases in the import mapper.
18. **Stale request file**: the checked-in HTTP request collection targets obsolete
    routes and payloads.
19. **Contradictory written guidance** (framework version, HTTP client choice, state
    ownership) increases the chance of inconsistent contributions.
20. **Repository-save-per-mutation** offers no transactional boundary across a
    multi-step use case (for example, closing a book writes two records sequentially).
21. **Legacy migration uses reflection** to set private entity state, which is fragile
    against domain refactors.
22. **Development seeding and permissive CORS** are convenient but must remain strictly
    environment-gated.
23. **Naming drift**: a couple of test-name/PRD identifiers suggest an earlier project
    name or a different feature ordering.
24. **No CI quality gate**, so zero-warning, lint, and test obligations depend on
    individual discipline.

---

## 12. Open Questions & Unknowns

1. **Is offline mode a supported product surface or an experiment?** The original
   application brief states there is no offline requirement, yet a full IndexedDB
   implementation and PRD exist. Clarify whether offline is shipped, deprecated, or a
   testing affordance.
2. **What is the intended semantic of the daily/monthly report series — net or
   expense-only?** The contract and implementation disagree; a definitive answer changes
   both the API and the insight UI.
3. **What is the intended backup-restore merging policy?** The contract (never clear
   books) and implementation (clear then restore) are irreconcilable as written.
4. **Should report exports produce real data, and should XLSX be genuine XLSX?** If not,
   both should be removed from the contract and UI.
5. **What is the canonical Main-book identity?** Name-based lookup is ambiguous under
   sharing; an owner-scoped main flag would remove the class of bugs in §11.10.
6. **Are category reassignments intended to be name-based forever?** The UI's
   identifier-based model and the name-based API are misaligned; a stable category
   identifier on transactions would resolve this.
7. **What are the retention and privacy expectations for backups and exported files on
   disk?** No cleanup policy is encoded; export files accumulate indefinitely.
8. **Is multi-instance deployment ever intended?** If so, the in-memory rate limiter,
   channel-based job queue, and SQLite file require redesign.
9. **What are the performance targets and expected ledger sizes?** No numbers exist to
   validate the in-memory aggregation choices.
10. **Is there a release/versioning process?** Only a URL prefix and backup schema version
    exist; no product versioning or migration/upgrade policy for the API is defined.
11. **Should the frontend have e2e coverage and CI gates?** Currently absent.
12. **Should the shared-book model expose per-book permissions beyond edit/view at the
    global level?** The contract lists granular global permissions as a future follow-up.
13. **Where do production secrets and data-protection keys live in practice?** The
    Compose file and docs imply a volume and environment variables, but no secret
    management solution is present.
14. **What happens to closing entries when a book is reopened and then closed again?**
    The contract implies manual adjustment; no guard prevents duplicate balancing entries.

---

## 13. Glossary

- **Book (sub-ledger):** A named container for transactions, such as "Main" or
  "Vacation 2026". Every user always has at least one.
- **Main book:** The default book created at registration. All reporting is derived from
  it, and closed-book balances are folded into it.
- **Closing entry:** An auto-generated balancing transaction written into the Main book
  when another book is closed. Tagged and back-referenced so it can be distinguished from
  user transactions.
- **Transaction:** A single signed financial event (negative expense, positive income)
  recorded against a book and optionally a category.
- **Category:** A user-level classification label applied to transactions, carrying an
  optional recurring marker, colour, icon, and display order. Referenced by name.
- **Recurring flag:** A hint on a category that spending/income is expected periodically;
  it does not create transactions.
- **Original currency / original amount / exchange rate:** The multi-currency capture of
  a transaction before conversion into the book's base currency.
- **Book sharing:** Granting another registered user view or edit access to a specific
  book.
- **Global share:** Granting another user edit access to all of the owner's books, present
  and future.
- **As-of:** An inclusive end-of-day boundary used by book statistics.
- **Export job:** An asynchronous server-side task that renders a dataset to a file for
  download.
- **Backup:** A JSON document containing all books, categories, and transactions, carrying
  an export timestamp and a schema version.
- **Import issue:** A per-row validation message with a 1-based row number, optional
  field, message, and severity (error skips, warning processes).
- **Preview mode (import):** Validate-and-report without committing.
- **Partial success:** Import semantics where valid rows commit even if others fail.
- **Clear existing:** An import option that deletes prior records of the target type
  before inserting.
- **Offline / local-only mode:** A user-selectable mode that runs the entire app against
  browser-local IndexedDB with a local identity, independent of the server.
- **Ledger Eleven:** The predecessor product from which a one-way migration is provided.
- **Tenant boundary:** The rule that a user may only read or mutate data in books they own
  or are shared into; enforced across search, export, import, and reporting.
- **Current book:** The user's persisted selection, used as the default context for entry
  and history.
