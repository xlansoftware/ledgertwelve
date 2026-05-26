# PRD: Dashboard Aggregates API

## Problem Statement

The ledger currently creates and stores aggregate views of transactions at daily, weekly, monthly, and yearly granularities (split by book, author, category, and currency). However, there is no API to retrieve these aggregates. The frontend cannot display summary dashboards, charts, or trend data without first computing them client-side — which is expensive and duplicates the server-side aggregation logic.

Users need a fast, server-backed endpoint to fetch pre-computed aggregate data at any granularity, with filtering and pagination.

## Solution

Expose a single `GET /api/dashboard` endpoint that returns paginated aggregate data. A `granularity` query parameter selects the time bucket (daily/weekly/monthly/yearly). Optional filter parameters (`from`, `to`, `book`, `author`, `category`, `currency`) narrow the result set. A new `IDashboardService` orchestrates the query; the query logic lives on the existing `ITransactionRepository` via a generic aggregate query method.

## User Stories

1. As a user viewing the dashboard, I want to see aggregate transaction data by day, so that I can spot daily trends in my spending.
2. As a user viewing the dashboard, I want to see aggregate transaction data by week, so that I can compare week-over-week performance.
3. As a user viewing the dashboard, I want to see aggregate transaction data by month, so that I can track monthly budget adherence.
4. As a user viewing the dashboard, I want to see aggregate transaction data by year, so that I can review annual financial summaries.
5. As a user, I want to filter aggregates by a date range (`from` / `to`), so that I can focus on a specific time period.
6. As a user, I want to filter aggregates by `book`, so that I can see data for a specific ledger book in isolation.
7. As a user, I want to filter aggregates by `author`, so that I can see data attributed to a specific person.
8. As a user, I want to filter aggregates by `category`, so that I can drill into a specific spending or income category.
9. As a user, I want to filter aggregates by `currency`, so that I can view reports in a single currency.
10. As a user, I want paginated results, so that I can browse large result sets without overwhelming the UI.
11. As a developer, I want a single endpoint for all granularities, so that the frontend only needs one client method to call.
12. As a developer, I want the endpoint to default to the last 90 days with no filters, so that the dashboard works out-of-the-box on first load.
13. As an API consumer, I want the paginated response to follow the project's standard paginated shape (`items`, `totalCount`, `page`, `pageSize`), so that I can reuse existing pagination handling logic.

## Implementation Decisions

### Route design

- **Single endpoint** `GET /api/dashboard` with a required `granularity` query parameter (values: `daily`, `weekly`, `monthly`, `yearly`).
- Uses the existing `Granularity` enum from `ledger12.Domain.PeriodHelper`.

### Query parameters

All optional:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `granularity` | string | _required_ | One of: `daily`, `weekly`, `monthly`, `yearly` |
| `from` | date (ISO 8601) | 90 days before `to` | Inclusive start of `PeriodStart` range |
| `to` | date (ISO 8601) | today (UTC) | Inclusive end of `PeriodStart` range |
| `book` | string | (none) | Exact match on `Book` |
| `author` | string | (none) | Exact match on `Author` |
| `category` | string | (none) | Exact match on `Category` |
| `currency` | string | (none) | Exact match on `Currency` |
| `page` | int | 1 | Page number (1-based) |
| `pageSize` | int | 20 | Items per page (max 100) |

### Response shape

```json
{
  "items": [
    {
      "periodStart": "2026-05-26",
      "book": "",
      "author": "Alice",
      "category": "Food",
      "currency": "USD",
      "sumValue": 150.50,
      "transactionCount": 3
    }
  ],
  "totalCount": 100,
  "page": 1,
  "pageSize": 20
}
```

### API contract errors

All error responses use the standard shape:
```json
{ "error": "Human-readable message" }
```

- Invalid `granularity` value → `400 Bad Request`
- `page < 1` → `400 Bad Request`
- `pageSize > 1000` → `400 Bad Request`
- `pageSize < 1` → `400 Bad Request`
- `from` after `to` → `400 Bad Request`

### Repository layer

- A new generic method is added to `ITransactionRepository`:
  - Accepts a `Granularity`, a filter object, and pagination params.
  - Returns a `PagedResult<T>` where `T : class, IAggregateEntity`.
  - Internally selects the correct `DbSet<T>` via a dictionary mapping `Granularity → DbSet<T>`.
  - Builds an `IQueryable<T>` with `.Where()` clauses for each provided filter.
  - Applies `.OrderBy(PeriodStart)`, `.Skip()`, `.Take()`.
  - Runs two queries: one `COUNT(*)` for total, one `SELECT ... LIMIT/OFFSET` for items.

### Service layer

- New `IDashboardService` with a single method `GetDashboardAsync(Granularity, DashboardQuery)`.
- Implementation:
  1. Sane defaults: if `from`/`to` not set, default to 90-day window ending today.
  2. Validates `from <= to`.
  3. Delegates to `ITransactionRepository` generic query method.
  4. Maps each aggregate entity to an `AggregateResponse` record.
  5. Wraps the mapped results in a `PagedResult<AggregateResponse>`.

### DTOs

- `AggregateResponse(PeriodStart, Book, Author, Category, Currency, SumValue, TransactionCount)` — flat record, mirrors the aggregate entity.
- `DashboardQuery(From, To, Book, Author, Category, Currency, Page, PageSize)` — input DTO for filter + pagination params.

### Authorization

- The controller action carries `[Authorize]`, consistent with all other endpoints.
- No additional authorization logic; aggregates are not user-scoped (they share the same access model as transactions).

## Testing Decisions

### What makes a good test

- Test **external behaviour**, not implementation details.
- For repositories: seed the in-memory database, call the method, assert the returned data and pagination metadata.
- Do not test EF Core internals or the SQL generated — trust the provider.

### Which modules will be tested

- **`TransactionRepository`** — integration tests with in-memory SQLite/EF Core for the new aggregate query method.

### Prior art

- `TransactionRepositoryTests` in `ledger12.Tests/Integration/TransactionRepositoryTests.cs` uses `UseInMemoryDatabase`, `IDisposable`, and follows AAA pattern. The new tests will follow the same structure.

### Test scenarios

The aggregate query tests should cover:

1. Returns aggregates matching the given `Granularity` (daily vs. weekly vs. monthly vs. yearly).
2. Returns only aggregates within the `from`/`to` date range.
3. Returns only aggregates matching `book`, `author`, `category`, `currency` filters (each individually, and combined).
4. Returns empty result set when no aggregates match.
5. Pagination: returns correct page slice and `totalCount`.
6. Default date range (no `from`/`to` provided — falls to service-level default) — this is tested at the service level.
7. Ordering: results are ordered by `PeriodStart` ascending.

## Out of Scope

- No write endpoints for aggregates (they are computed as side effects of transaction creation).
- No chart-specific endpoints (the frontend renders charts from this flat data).
- No aggregation across dimensions (e.g., totals by category across all books) — these can be computed client-side.
- No caching layer.
- No frontend implementation in this PRD.
- No API versioning.
- No `PeriodEnd` or `AverageValue` computed fields — easily computed by the client.

## Further Notes

- The `Granularity` enum is defined in `ledger12.Domain` and is shared between `PeriodHelper`, the repository query method, and the dashboard endpoint — this keeps the mapping from URL parameter → DB table in one place.
- The `ITransactionRepository` is extended rather than creating a new repository because aggregates are already written there as a side effect of `AddAsync`.
- The `IDashboardService` exists as a separate interface from `ILedgerService` to keep read and write concerns separated per Clean Architecture.