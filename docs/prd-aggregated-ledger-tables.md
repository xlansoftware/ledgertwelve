# PRD: Aggregated Ledger Tables

## Problem Statement

The ledger app records individual transactions but has no way to efficiently answer dashboard queries like "what was my total spending per category this month" or "show me a daily spending chart for the last 30 days". As the transaction volume grows, grouping and summing on-the-fly becomes slow. The app needs pre-computed aggregates at daily, weekly, monthly, and yearly granularities to serve dashboard charts quickly.

## Solution

Introduce four aggregate tables — one per time granularity — that store the sum of transaction values and transaction count, grouped by `(Book, Author, Category, Currency)` for each period. These aggregates are updated inline when a new transaction is created, in the same database transaction, keeping them consistent with the transaction log.

The frontend dashboard can then query the relevant aggregate table with a simple `WHERE PeriodStart BETWEEN @start AND @end` rather than scanning thousands of individual transactions.

## User Stories

1. As a dashboard viewer, I want to see a **daily spending chart** for a selected date range, so that I can track spending patterns day by day.
2. As a dashboard viewer, I want to see a **weekly spending chart**, so that I can compare week-over-week trends.
3. As a dashboard viewer, I want to see a **monthly spending chart**, so that I can review my monthly budget performance.
4. As a dashboard viewer, I want to see a **yearly spending chart**, so that I can analyse long-term financial trends.
5. As a dashboard viewer, I want spending broken down by **category** within each period, so that I know where my money is going.
6. As a dashboard viewer, I want spending broken down by **author**, so that I can see how spending is distributed across users.
7. As a dashboard viewer, I want spending broken down by **book**, so that I can separate personal vs. business or project-specific spending.
8. As a dashboard viewer, I want spending broken down by **currency**, so that multi-currency totals are meaningful rather than summed across different units.
9. As a transaction recorder, I want the aggregates to be **up-to-date immediately** after I create a transaction, so that the dashboard reflects reality without delays.
10. As a developer, I want the aggregate update to happen **inside the same database transaction** as the transaction insert, so that I never have aggregates out of sync with transactions.
11. As a future maintainer, I want the aggregate logic to be **testable in isolation** without needing a full database, so that I can add new features with confidence.

## Implementation Decisions

### Domain entities (ledger12.Domain)

Four entities, one per granularity, all sharing the same shape:

| Field | Type | Notes |
|---|---|---|
| `PeriodStart` | `DateOnly` | PK part 1; start of the period |
| `Book` | `string` | PK part 2; non-nullable |
| `Author` | `string` | PK part 3 |
| `Category` | `string` | PK part 4 |
| `Currency` | `string` | PK part 5 |
| `SumValue` | `decimal` | `decimal(18,2)` |
| `TransactionCount` | `int` | |

- `DailyAggregate` — PeriodStart represents the UTC date
- `WeeklyAggregate` — PeriodStart represents the Monday of the ISO 8601 week
- `MonthlyAggregate` — PeriodStart represents the 1st of the month
- `YearlyAggregate` — PeriodStart represents the 1st of the year (`YYYY-01-01`)

Entities are in `ledger12.Domain` as that's where `Transaction` lives.

### Period computation (deep module)

Pure utility — given a `DateTimeOffset` and a granularity, returns the `DateOnly PeriodStart`. Key design: this is a **deep module** because it encapsulates a lot of calendar logic (ISO 8601 week boundaries, UTC date derivation) behind a simple, testable, unchanging interface.

Only one decision-encoding snippet needed: the ISO 8601 week algorithm:

```csharp
// Week start = Monday
static DateOnly GetWeekStart(DateTimeOffset date)
{
    var utc = date.UtcDateTime.Date;
    int diff = (7 + (int)utc.DayOfWeek - (int)DayOfWeek.Monday) % 7;
    return DateOnly.FromDateTime(utc.AddDays(-diff));
}
```

All other periods are trivial truncations of the UTC date.

### Repository structure

- **`ITransactionRepository`** — the existing interface gets a new method for reading aggregate data (to be used by the dashboard query endpoints in a follow-up PRD). The aggregate **write** logic lives inside `TransactionRepository.AddAsync`, which handles all four aggregate table upserts directly after inserting the transaction row. All operations share the same `AppDbContext`, so a single `SaveChangesAsync` commits atomically.
- **No separate aggregate repository** is introduced. Since the aggregate tables are updated only as a side-effect of transaction creation, and they live in the same `AppDbContext`, the upsert logic is kept in the single write-path repository. This avoids an extra layer of indirection and keeps the transaction boundary explicit in one place.
- The upsert logic for each aggregate entity is extracted into a private helper method on `TransactionRepository` (or a set of them), keeping `AddAsync` readable while remaining testable via the repository's public contract.

### EF Core configuration

- The composite primary key `(PeriodStart, Book, Author, Category, Currency)` is configured via Fluent API for each entity.
- `Book` has a nullable column configuration in `Transaction.Book`. Default to empty string if the `Transaction.Book` is null since EF do not allow null values in PK.
- Upsert uses `dbSet.Add()` + `SaveChangesAsync` — if the PK already exists, catch the SQL constraint violation and retry with an update. Alternatively, check existence first with a query.

### API layer

No changes to the API. The aggregate tables are updated as a side-effect of the existing `POST /api/ledger/transaction` endpoint. The read endpoints for the dashboard will be added in a separate PRD.

## Testing Decisions

### What makes a good test

- Test external behaviour, not implementation details.
- For the **PeriodHelper**: test with known UTC dates and assert the expected `PeriodStart` for each granularity. Include edge cases (year boundary for weekly, leap year for monthly, DST transitions — though UTC avoids DST issues).
- For the **TransactionRepository**: test that `AddAsync` inserts the transaction and updates all four aggregate tables correctly. Use an EF Core in-memory provider so the upsert logic runs against a real store. Assert that two transactions in the same bucket produce `SumValue = v1 + v2` and `TransactionCount = 2`.

### Modules to test

| Module | Test approach | Prior art |
|---|---|---|
| **PeriodHelper** | Pure unit tests, no mocking | New (no prior art in codebase) |
| **TransactionRepository** (modified) | Integration tests with EF Core in-memory provider — add a transaction, then query the aggregate tables directly to verify the upserts | `LedgerServiceTests` shows the mocking pattern; here we lean on the in-memory provider for end-to-end correctness of the upsert logic |
| **LedgerService** (unchanged) | Already covered by existing tests | `LedgerServiceTests` |

### What NOT to test

- The EF Core query generation or SQL translation — trust the provider.
- The DI registration — one integration smoke test is sufficient.
- The domain entities' property mapping — implicit from the Fluent API config.

## Out of Scope

- Dashboard read endpoints (query APIs and controller actions) — will be covered by a separate PRD.
- Frontend charts and UI — separate PRD.
- Editing or deleting transactions — the write path currently only supports creation. Edits/deletes would need to decrement aggregates, which is future work.
- Timezone-aware periods — all period computation uses UTC. Per-user timezone support is explicitly deferred.
- Eventual consistency / background job approach — inline update was chosen for simplicity.
- Performance benchmarks — defer until the dashboard read path exists.

## Further Notes

- The aggregate tables are purely a read optimisation. The `Transaction` table remains the source of truth.
- If the write path later supports edit/delete, the aggregate update logic must handle negative adjustments and recount. The `TransactionCount` column makes recount possible.
- Currency is part of the group key so that multi-currency ledgers produce meaningful per-currency sums. A future aggregate read endpoint may also return per-total-per-period-in-base-currency, but that conversion logic is out of scope.
- The four entities could have been a single table with a discriminator column, but separate tables were chosen for simpler queries and independent indexing.