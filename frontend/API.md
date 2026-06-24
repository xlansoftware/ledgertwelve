# API Reference

Base path: `/api/v1`

Auth: Cookie-based (Identity). `/api/v1/auth/login` and `/api/v1/auth/whoami` are unauthenticated; everything else requires `[Authorize]`.

Error shape: `{ "error": "Human-readable message" }`

---

## Date range conventions

Endpoints that accept date range parameters (`from`, `to`, or `asOf`) follow this convention:

| Parameter | Semantics |
|-----------|-----------|
| `from`    | **Inclusive** — transactions on or after this date/time are included. |
| `to`      | **Exclusive** — transactions **before** this date/time are included. The upper bound itself is **not** included. |
| `asOf`    | **Inclusive** — transactions on or before this date are included (end-of-day semantics). |

### Examples

| Query | What it returns |
|-------|----------------|
| `from=2026-01-20&to=2026-01-21` | Transactions for **Jan 20** only (from inclusive, to exclusive). |
| `from=2026-01-01&to=2026-02-01` | All transactions in **January** (from Jan 1 inclusive, to Feb 1 exclusive means up to end of Jan 31). |
| `from=2026-01-01&to=2026-12-31` | Transactions from **Jan 1 through Dec 30** — likely a mistake unless Dec 31 should be excluded. To include all of Dec, use `to=2027-01-01`. |

### Best practice for single-day queries

```text
# Get all transactions on 2026-01-20
from=2026-01-20&to=2026-01-21
```

Send `to` as the **next day** after the last day you want to include. No time components are needed — the exclusive upper bound handles the boundary cleanly.

### Server-side implementation

When implementing filter logic:

```
if (from) tx.dateTime >= fromDate
if (to)   tx.dateTime <  toDate
```

This principle applies uniformly across list endpoints, report endpoints, and export endpoints.

---

# Authentication

ASP.NET Identity handles registration, password reset, email verification, etc.

---

# POST /api/v1/auth/login

Creates an authenticated session and returns the current user.

### Purpose

Authenticate user and issue HTTP-only secure session cookie.

### Request

```json
{
  "email": "john@example.com",
  "password": "secret-password"
}
```

### Response

```json
{
  "data": {
    "id": "usr_123",
    "email": "john@example.com"
  }
}
```

### Notes

Server sets:

```http
Set-Cookie:
ledger12.session=...
HttpOnly
Secure
SameSite=Lax
```

---

# POST /api/v1/auth/logout

### Purpose

End the current authenticated session. Server clears the session cookie.

### Request

No body.

### Response

```json
{
  "data": {
    "success": true
  }
}
```

### Unauthorized

```http
401 Unauthorized
```

---

# GET /api/v1/auth/whoami

### Purpose

Returns currently authenticated user.

### Request

No body.

### Response

```json
{
  "data": {
    "id": "usr_123",
    "email": "john@example.com"
  }
}
```

### Unauthorized

```http
401 Unauthorized
```

---

# Users

---

# GET /api/v1/users

### Purpose

Returns all users the current user has interacted with — the current user themself plus all collaborators from shared books.

### Response

```json
{
  "data": [
    {"id": "usr_1", "email": "john@example.com"},
    {"id": "usr_2", "email": "friend@example.com"}
  ]
}
```

---

# Core DTOs

---

## UserSummary

```json
{
  "id": "usr_123",
  "email": "john@example.com"
}
```

---

## CategoryDto

```json
{
  "id": "cat_1",
  "name": "Food",
  "recurring": false,
  "color": "#FF5733",
  "icon": "utensils",
  "order": 1,
  "createdAt": "2026-01-01T10:00:00Z"
}
```

| Field | Type | Always | Notes |
|-------|------|--------|-------|
| `id` | string | yes | |
| `name` | string | yes | |
| `recurring` | boolean | no | Default `false`. |
| `color` | string | no | Hex color (e.g., `#FF5733`). |
| `icon` | string | no | Icon name. |
| `order` | number | no | Display order, 1-based. Sorted ascending. |
| `createdAt` | string | yes | ISO 8601 timestamp. |

---

## SharedUserDto

```json
{
  "userId": "usr_2",
  "email": "friend@example.com",
  "permission": "edit"
}
```

---

## BookDto

```json
{
  "id": "book_1",
  "name": "Vacation 2026",
  "currency": "EUR",
  "status": "open",
  "ownerId": "usr_1",
  "sharedWith": [],
  "createdAt": "2026-01-01T10:00:00Z",
  "closedAt": null
}
```

| Field | Type | Always | Notes |
|-------|------|--------|-------|
| `id` | string | yes | |
| `name` | string | yes | |
| `currency` | string | no | ISO currency code. |
| `status` | string | yes | `"open"` or `"closed"`. |
| `ownerId` | string | yes | User ID of the owner. |
| `sharedWith` | array | yes | Array of `SharedUserDto`. |
| `createdAt` | string | yes | ISO 8601 timestamp. |
| `closedAt` | string\|null | no | ISO 8601 timestamp when closed, or `null` if open. |

---

## TransactionDto

```json
{
  "id": "tx_1",
  "bookId": "book_1",
  "userId": "usr_1",

  "dateTime": "2026-05-01T12:00:00Z",

  "amount": -100,

  "originalCurrency": "USD",
  "originalAmount": -110,
  "exchangeRate": 0.91,

  "categoryName": "Food",

  "note": "Lunch",

  "createdAt": "2026-05-01T12:00:00Z",

  "isBookClosingEntry": false,
  "closedBookId": null
}
```

| Field | Type | Always | Notes |
|-------|------|--------|-------|
| `id` | string | yes | |
| `bookId` | string | yes | |
| `userId` | string | yes | User who created the transaction. |
| `dateTime` | string | yes | ISO 8601 timestamp. |
| `amount` | number | yes | Negative for expenses, positive for income. |
| `originalCurrency` | string | no | Required when using multi-currency. |
| `originalAmount` | number | no | Amount in original currency. |
| `exchangeRate` | number | no | Rate used for conversion. |
| `categoryName` | string | no | Category name (not ID). |
| `note` | string | no | Free text. |
| `createdAt` | string | yes | ISO 8601 timestamp. |
| `isBookClosingEntry` | boolean | no | `true` if this is an auto-generated closing transaction. |
| `closedBookId` | string\|null | no | If this is a closing entry, the ID of the closed book. `null` otherwise. |

---

# Categories

Categories are user-owned and global across all books.

---

# GET /api/v1/categories

### Purpose

List all categories for current user.

### Response

```json
{
  "data": [
    {
      "id": "cat_1",
      "name": "Food",
      "recurring": false,
      "color": "#FF5733",
      "icon": "utensils"
    }
  ]
}
```

---

# POST /api/v1/categories

### Purpose

Create category.

### Request

```json
{
  "name": "Rent",
  "recurring": true,
  "color": "#3366FF",
  "icon": "house"
}
```

### Response

```json
{
  "data": {
    "id": "cat_5",
    "name": "Rent",
    "recurring": true,
    "color": "#3366FF",
    "icon": "house"
  }
}
```

---

# PUT /api/v1/categories/{categoryId}

### Purpose

Update category.

### Request

```json
{
  "name": "Housing",
  "recurring": true,
  "color": "#3366FF",
  "icon": "house"
}
```

---

# DELETE /api/v1/categories/{categoryId}

### Purpose

Delete category definition.

Historical transactions remain unchanged.

### Query Parameters

```text
?replacementCategoryName=Housing
```

Optional.

If supplied:

* all matching transactions are reassigned.

If omitted:

* category disappears from selection lists only.

### Response

```json
{
  "data": {
    "reassignedTransactions": 42
  }
}
```

---

# POST /api/v1/categories/reassign

### Purpose

Bulk category reassignment.

### Request

```json
{
  "fromCategoryName": "Food",
  "toCategoryName": "Dining"
}
```

### Response

```json
{
  "data": {
    "affectedTransactions": 217
  }
}
```

---

# PUT /api/v1/categories/reorder

### Purpose

Reorder categories for the current user. The client sends the full list of category IDs in the desired display order. The server assigns the `order` field on each category accordingly.

### Request

```json
{
  "orderedIds": ["cat_3", "cat_1", "cat_2", "cat_5", "cat_4"]
}
```

`orderedIds` must contain every category ID belonging to the current user, in the new order.

### Response

```json
{
  "data": {
    "success": true
  }
}
```

### Errors

```json
// 400 — Missing orderedIds or mismatched count
{ "error": "orderedIds must contain all user categories" }

// 401 — Unauthenticated
{ "error": "Unauthorized" }
```

---

# Books

---

# GET /api/v1/books

### Purpose

List books visible to user.

Includes owned and shared books.

### Response

```json
{
  "data": [
    {
      "id": "book_main",
      "name": "Main",
      "currency": "EUR",
      "status": "open"
    },
    {
      "id": "book_vacation",
      "name": "Vacation 2026",
      "currency": "EUR",
      "status": "open"
    }
  ]
}
```

---

# GET /api/v1/books/{bookId}

### Purpose

Get single book.

### Response

```json
{
  "data": {
    "id": "book_vacation",
    "name": "Vacation 2026",
    "currency": "EUR",
    "status": "open",
    "ownerId": "usr_1",
    "sharedWith": [
      {
        "userId": "usr_2",
        "email": "friend@example.com",
        "permission": "edit"
      }
    ]
  }
}
```

---

# POST /api/v1/books

### Purpose

Create book.

### Request

```json
{
  "name": "Vacation 2026",
  "currency": "EUR"
}
```

### Response

```json
{
  "data": {
    "id": "book_123",
    "name": "Vacation 2026",
    "currency": "EUR",
    "status": "open",
    "ownerId": "usr_1",
    "sharedWith": [],
    "createdAt": "2026-06-24T10:00:00Z"
  }
}
```

---

# PUT /api/v1/books/{bookId}

### Purpose

Update book metadata.

### Request

```json
{
  "name": "Vacation Spain",
  "currency": "USD"
}
```

---

# DELETE /api/v1/books/{bookId}

### Purpose

Delete book.

### Rules

Cannot delete:

* Main book
* non-empty book

Alternative:

```http
409 Conflict
```

if transactions exist.

---

# GET /api/v1/books/{bookId}/stats

### Purpose

Returns read-only statistics for a book — transaction count and net sum.

### Query Parameters

```text
asOf=2026-05-31   (optional ISO 8601 date string)
```

- If `asOf` is **omitted**, behavior is unchanged: returns stats for the entire book (all non-closing transactions).
- If `asOf` is **provided**, `transactionCount` and `totalSum` are computed from non-closing transactions **on or before** that date only. `asOf` uses inclusive semantics — the server treats it as end-of-day by computing the exclusive upper bound as the next day (internally `dateTime < asOfDate + 1 day`). This returns the net balance as of end of day on the specified date.

### Response

```json
{
  "data": {
    "transactionCount": 142,
    "totalSum": -4523.50
  }
}
```

- `transactionCount` — number of non-closing transactions in the book.
- `totalSum` — net sum of all non-closing transaction amounts. When `asOf` is provided, this represents the net balance as of end of day on that date.
- Requires the book to be visible to the current user (owned or shared).
- Returns `404` if the book is not found or not visible.

---

# Book Sharing

---

# POST /api/v1/books/{bookId}/shares

### Purpose

Add shared user.

### Request

```json
{
  "email": "friend@example.com",
  "permission": "edit"
}
```

### Response (201)

```json
{
  "data": {
    "userId": "usr_2",
    "permission": "edit"
  }
}
```

---

# PUT /api/v1/books/{bookId}/shares/{userId}

### Purpose

Change permission.

### Request

```json
{
  "permission": "view"
}
```

---

# DELETE /api/v1/books/{bookId}/shares/{userId}

### Purpose

Remove sharing.

---

# Global Sharing

Global shares grant a user `edit` permission to **all books** owned by the current user — both existing books at the time the share is created, and any books created in the future. This avoids per-book permission management.

Later, per-book sharing with granular permissions (`view` / `edit`) will be added as a follow-up.

The share is always `edit` permission. `view` permission will be added at a later stage.

---

# POST /api/v1/shares

### Purpose

Create a global share: adds the user with `edit` permission to every book the current user owns (existing books at the time of the call, and implicitly all future books).

### Request

```json
{
  "email": "friend@example.com"
}
```

### Response (201)

```json
{
  "data": {
    "userId": "usr_2",
    "email": "friend@example.com",
    "affectedBooks": 3
  }
}
```

### Errors

```json
// 400 — Cannot share with yourself
{ "error": "Cannot share with yourself" }

// 404 — User not found (email doesn't match any registered user)
{ "error": "User not found" }

// 409 — Already shared
{ "error": "Already shared with this user" }
```

### Notes

- "All books" means the set of books where `ownerId` equals the current user's ID. Books the user was shared into by someone else are not affected.
- When a new book is created, all currently shared users receive `edit` access to it automatically (server-side logic).
- The `affectedBooks` field is informational — the frontend does not display it.

---

# DELETE /api/v1/shares/{userId}

### Purpose

Removes a user from every book the current user owns.

### Response (200)

```json
{
  "data": {
    "removed": true,
    "affectedBooks": 3
  }
}
```

### Errors

```json
// 404 — Share not found (the user is not currently shared)
{ "error": "Share not found" }
```

---

# GET /api/v1/rates/exchange

### Purpose

Look up an exchange rate between two currencies. Provides a default rate for the user to fill in when creating multi-currency transactions.

### Query Parameters

```text
from=USD
to=EUR
```

Both parameters are required.

### Response

```json
{
  "data": {
    "from": "USD",
    "to": "EUR",
    "rate": 0.91
  }
}
```

### Errors

```json
// 400 — Missing parameters
{ "error": "from and to query parameters are required" }

// 400 — Invalid currency code
{ "error": "Invalid currency code: XYZ" }
```

### Notes

Unauthenticated.
Currencies are case-insensitive ("usd", "Usd", "USD" all accepted).

---

# Book Closing

This deserves a dedicated command endpoint because it performs a business workflow.

---

# GET /api/v1/books/current

### Purpose

Returns the user's currently selected book. If the user has never explicitly selected a book, the server returns the first visible book ordered by creation date. The server guarantees that every user has at least one book (a default "Main" book created on registration).

### Response

```json
{
  "data": {
    "id": "book_main",
    "name": "Main",
    "currency": "EUR",
    "status": "open",
    "ownerId": "usr_1",
    "sharedWith": [],
    "createdAt": "2026-01-01T10:00:00Z"
  }
}
```

### Errors

- `401 Unauthorized`

---

# PUT /api/v1/books/current

### Purpose

Sets the user's current book. Validates that the book exists and is visible to the user.

### Request

```json
{
  "bookId": "book_vacation"
}
```

### Response

Full `BookDto` of the newly selected book (same shape as GET).

### Errors

- `400` — `bookId` missing or invalid
- `404` — Book not found or not visible to the user
- `401` — Unauthorized

---

# POST /api/v1/books/{bookId}/close

### Purpose

Close book and create balancing transaction in Main.

### Request

```json
{
  "closingCategoryName": "Transfers"
}
```

### Server Logic

1. Calculate net balance.
2. Create transaction in Main.
3. Set note:

```text
Close Vacation 2026
```

4. Mark book closed.

### Response

```json
{
  "data": {
    "bookId": "book_vacation",
    "status": "closed",
    "closingTransactionId": "tx_999",
    "netBalance": -452.75
  }
}
```

---

# POST /api/v1/books/{bookId}/reopen

### Purpose

Reopen closed book.

### Response

```json
{
  "data": {
    "bookId": "book_vacation",
    "status": "open"
  }
}
```

---

# Transactions

---

# GET /api/v1/transactions

### Purpose

Search transactions.

### Query Parameters

```text
bookId=
from=
to=
category=          (repeated, OR match on category name)
createdBy=         (repeated, OR match on user ID)
note=              (case-insensitive substring search)
minValue=          (inclusive minimum amount)
maxValue=          (inclusive maximum amount)
page=
pageSize=
```

Example:

```text
GET /transactions?bookId=book_1&from=2026-01-01&to=2026-12-31&category=Food&category=Dining&note=lunch&minValue=-200&maxValue=500
```

### Response

```json
{
  "data": [
    {}
  ],
  "meta": {
    "page": 1,
    "pageSize": 50,
    "total": 142
  }
}
```

The transactions are always sorted by date descending.

---

# GET /api/v1/transactions/{transactionId}

### Purpose

Get transaction.

---

# POST /api/v1/transactions

### Purpose

Create transaction.

### Request

```json
{
  "bookId": "book_1",

  "dateTime": "2026-05-01T12:00:00Z",

  "amount": -100,

  "originalCurrency": "USD",
  "originalAmount": -110,
  "exchangeRate": 0.91,

  "categoryName": "Food",

  "note": "Lunch"
}
```

### Response (201)

```json
{
  "data": {
    "id": "tx_1",
    "bookId": "book_1",
    "userId": "usr_1",
    "dateTime": "2026-05-01T12:00:00Z",
    "amount": -100,
    "originalCurrency": "USD",
    "originalAmount": -110,
    "exchangeRate": 0.91,
    "categoryName": "Food",
    "note": "Lunch",
    "createdAt": "2026-05-01T12:00:00Z"
  }
}
```

### Validation

If:

```json
{
  "originalCurrency": "USD"
}
```

then:

```json
{
  "originalAmount": ...
}
```

and

```json
{
  "exchangeRate": ...
}
```

must exist.

---

# PUT /api/v1/transactions/{transactionId}

### Purpose

Update transaction.

Same shape as create.

---

# DELETE /api/v1/transactions/{transactionId}

### Purpose

Delete transaction.

### Response

```json
{
  "data": {
    "deleted": true
  }
}
```

---

# Reporting

All report endpoints accept an optional `bookId` query parameter. Defaults to the Main book if omitted.

Implement reports as read-only query endpoints.

---

# GET /api/v1/reports/totals

### Query Parameters

| Parameter | Required | Format | Description |
|-----------|----------|--------|-------------|
| `period` | no | string | Grouping period: `"day"`, `"week"`, `"month"` (default), or `"year"`. |
| `from` | no | `YYYY-MM-DD` | Inclusive start date. |
| `to` | no | `YYYY-MM-DD` | Exclusive end date. |

Only Main book transactions are included.

### Response

```json
{
  "data": [
    {
      "period": "2026-01",
      "income": 4500,
      "expense": -3100,
      "net": 1400
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `period` | Key depends on `period` param: `YYYY-MM-DD` for day, Monday's date for week, `YYYY-MM` for month, `YYYY` for year |
| `income` | Sum of positive-amount transactions in the period. |
| `expense` | Sum of negative-amount transactions in the period. |
| `net` | `income + expense` (negative = net expense). |

---

# GET /api/v1/reports/categories

### Query Parameters

| Parameter | Required | Format | Description |
|-----------|----------|--------|-------------|
| `from` | no | `YYYY-MM-DD` | Inclusive start date. |
| `to` | no | `YYYY-MM-DD` | Exclusive end date. |

If both `from` and `to` are omitted, returns category breakdown across all time.

### Response

```json
{
  "data": [
    {
      "categoryName": "Food",
      "amount": -542.50
    }
  ]
}
```

Only Main book transactions are included in the computation. Amounts are rounded to 2 decimal places.

---

# GET /api/v1/reports/daily

### Purpose

Returns daily net amounts for the Main book within a given date range.

### Query Parameters

```text
from=2026-06-11
to=2026-06-20
```

Both `from` and `to` are required ISO 8601 date strings.

### Response

```json
{
  "data": [
    { "date": "2026-06-11", "amount": -45.00 },
    { "date": "2026-06-12", "amount": 120.00 },
    { "date": "2026-06-13", "amount": -30.00 }
  ]
}
```

- `date` — `YYYY-MM-DD` string (date only, no time component).
- `amount` — net amount for that day (negative = net expense, positive = net income).
- Sorted ascending by date.
- Days with no transactions are omitted from the response.

### Errors

```json
// 400 — Missing from or to
{ "error": "from and to query parameters are required" }

// 401 — Unauthenticated
{ "error": "Unauthorized" }
```

---

# GET /api/v1/reports/monthly

### Purpose

Returns monthly net amounts for the Main book within a given date range.

### Query Parameters

```text
from=2026-01-01
to=2026-06-01
```

Both `from` and `to` are required ISO 8601 date strings.

### Response

```json
{
  "data": [
    { "period": "2026-01", "amount": -1234.50 },
    { "period": "2026-02", "amount": 2100.00 },
    { "period": "2026-03", "amount": -950.25 }
  ]
}
```

- `period` — `"YYYY-MM"` string (date only, no time component).
- `amount` — net amount for that month (negative = net expense, positive = net income).
- Sorted ascending by period.
- Months with no transactions are omitted from the response.

### Errors

```json
// 400 — Missing from or to
{ "error": "from and to query parameters are required" }

// 401 — Unauthenticated
{ "error": "Unauthorized" }
```

---

# GET /api/v1/reports/average/daily

### Purpose

Returns the average daily net amount over a date range. Used to compute the projection rate for the daily insight chart.

### Query Parameters

| Parameter | Required | Format | Description |
|-----------|----------|--------|-------------|
| `from` | yes | `YYYY-MM-DD` | Inclusive start date. |
| `to` | yes | `YYYY-MM-DD` | Exclusive end date. |
| `bookId` | no | string | Book ID to report on. Defaults to Main book. |

### Semantics

Server computes `SUM(amount) / COUNT(days_with_transactions)` for the specified book's transactions whose `date` is `>= from` and `< to`. Days with no transactions are not counted — they contribute zero to the sum but do not inflate the divisor.

### Response

```json
{
  "data": {
    "average": -45.50,
    "count": 365
  }
}
```

- `average` — net average per day (negative = net expense, positive = net income). Rounded to 2 decimal places.
- `count` — number of days in the queried range that have at least one transaction.

### Errors

```json
// 400 — Missing from or to
{ "error": "from and to query parameters are required" }

// 401 — Unauthenticated
{ "error": "Unauthorized" }
```

### Example

```text
GET /api/v1/reports/average/daily?from=2025-06-22&to=2026-06-22
```

---

# GET /api/v1/reports/average/monthly

### Purpose

Returns the average monthly net amount over a date range. Used to compute the projection rate for the monthly insight chart.

### Query Parameters

| Parameter | Required | Format | Description |
|-----------|----------|--------|-------------|
| `from` | yes | `YYYY-MM-DD` | Inclusive start date. |
| `to` | yes | `YYYY-MM-DD` | Exclusive end date. |
| `bookId` | no | string | Book ID to report on. Defaults to Main book. |

### Semantics

Server groups transactions by calendar month (`YYYY-MM`) within `[from, to)`, computes the net sum for each month, then returns `SUM(monthly_net) / COUNT(months_with_transactions)`. Months with no transactions are not counted.

### Response

```json
{
  "data": {
    "average": -1380.00,
    "count": 12
  }
}
```

- `average` — net average per month (negative = net expense, positive = net income). Rounded to 2 decimal places.
- `count` — number of months in the queried range that have at least one transaction.

### Errors

```json
// 400 — Missing from or to
{ "error": "from and to query parameters are required" }

// 401 — Unauthenticated
{ "error": "Unauthorized" }
```

### Example

```text
GET /api/v1/reports/average/monthly?from=2025-06-01&to=2026-06-01
```

---

# Export

Exports should be asynchronous because XLSX generation can become expensive.

---

# POST /api/v1/exports

### Purpose

Create export job.

### Validation

| Field | Required | Valid values | Notes |
|---|---|---|---|
| `format` | yes | `"csv"`, `"xlsx"`, `"json"` | Ignored when `contentType = "backup"` — server forces `"json"` |
| `contentType` | yes | `"categories"`, `"transactions"`, `"books"`, `"report-daily-total"`, `"report-daily-per-category"`, `"report-monthly-total"`, `"report-monthly-per-category"`, `"report-yearly-total"`, `"report-yearly-per-category"`, `"backup"` | |
| `bookId` | conditional | valid book ID | Required when `contentType = "transactions"`. Ignored when `contentType = "backup"`. For report content types, defaults to Main book if omitted. |

### Request (categories)

```json
{
  "format": "csv",
  "contentType": "categories"
}
```

### Request (transactions)

```json
{
  "format": "xlsx",
  "contentType": "transactions",
  "bookId": "book_main"
}
```

### Request (backup)

```json
{
  "contentType": "backup"
}
```

### Response (201)

```json
{
  "data": {
    "jobId": "exp_123",
    "status": "pending"
  }
}
```

---

# GET /api/v1/exports/{jobId}

### Purpose

Check export status.

### Response (processing)

```json
{
  "data": {
    "jobId": "exp_123",
    "status": "processing"
  }
}
```

### Response (completed)

```json
{
  "data": {
    "jobId": "exp_123",
    "status": "completed",
    "downloadUrl": "/api/v1/exports/exp_123/download"
  }
}
```

### Response (failed)

```json
{
  "data": {
    "jobId": "exp_123",
    "status": "failed",
    "errorMessage": "Failed to generate XLSX: insufficient memory"
  }
}
```

---

### CSV / XLSX column format

For human-readable formats (CSV, XLSX), foreign-key ID columns are replaced with their display values:

| Content type | ID column replaced | Display value |
|---|---|---|
| `transactions` | `bookId` → `book` | Book name |
| `transactions` | `userId` → `user` | User email |
| `books` | `ownerId` → `owner` | Owner email |

The `json` format retains raw IDs (`bookId`, `userId`, `ownerId`) for machine consumption.

Download filenames for CSV/XLSX transaction exports use the **book name** instead of the `bookId`.

---

# GET /api/v1/exports/{jobId}/download

### Purpose

Download generated file.

### Response

```http
200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="transactions-Main-2026-06-24.xlsx"
```

### Download filenames

| contentType | Example filename |
|---|---|
| `categories` | `categories-2026-06-24.csv` |
| `transactions` | `transactions-Main-2026-06-24.xlsx` (uses book name) |
| `books` | `books-2026-06-24.json` |
| `report-daily-total` | `report-daily-total-2026-06-24.csv` |
| `backup` | `ledger12-backup-2026-06-24.json` |

### JSON backup shape

```json
{
  "exportedAt": "2026-06-24T12:00:00Z",
  "version": 1,
  "books": [ ... ],
  "categories": [ ... ],
  "transactions": [ ... ]
}
```

---

# Import

Imports parse and mapping happen client-side. The server receives already-mapped, typed data and performs validation, upsert, and creation.

---

# POST /api/v1/imports

### Purpose

Import data into the ledger. Supports three entity types (`transactions`, `categories`, `books`) plus a special `backup` mode for restoring a full JSON backup.

### Modes

| Mode | Behavior |
|------|----------|
| `preview: true` | Validates all rows and returns counts + per-row issues **without committing**. Used to show the user what will happen before they confirm. |
| `preview: false` | Validates and commits. Successful rows are created or updated. Failed rows are skipped and reported in the response. The operation is **not** all-or-nothing. |

### Request (single entity type)

```json
{
  "preview": true,
  "entityType": "transactions",
  "bookId": "book_main",
  "clearExisting": false,
  "mapping": {
    "Date": "dateTime",
    "Value": "amount",
    "Description": "note"
  },
  "rows": [
    { "dateTime": "2026-06-01T00:00:00Z", "amount": -100, "note": "Lunch" },
    { "dateTime": "2026-06-02T00:00:00Z", "amount": -50, "note": "Coffee" }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `preview` | yes | `true` to validate only; `false` to commit. |
| `entityType` | yes | `"transactions"`, `"categories"`, `"books"`, or `"backup"`. |
| `bookId` | conditional | Required for `entityType: "transactions"`. The fallback book when no row has a `bookId` field. Ignored for other entity types. |
| `clearExisting` | no | Default `false`. If `true`, deletes all existing records of the given entity type (for transactions: scoped to `bookId`) before creating new rows. Ignored in preview mode — the preview response includes the `deleted` count to show impact. |
| `mapping` | conditional | Required for `transactions`/`categories`/`books`. Source column name → target field name. Used for building richer error messages. Not used for `backup`. |
| `rows` | conditional | Required for `transactions`/`categories`/`books`. Array of objects where keys are **target field names** and values are already typed (dates as ISO 8601 strings, amounts as numbers). Not used for `backup`. |
| `data` | conditional | Required for `backup`. The full backup JSON object (`exportedAt`, `version`, `books`, `categories`, `transactions`). Not used for other entity types. |

### Upsert logic

- If a row contains an `id` field with a value that matches an existing record, that record is **updated**. Otherwise a new record is **created**.
- If no `id` field is present in the mapping, all rows are treated as creates.
- Per-row behavior: a row with an empty/null `id` is always a create, even if other rows in the same import have IDs.

### `clearExisting` behavior

- For `entityType: "transactions"`: deletes all transactions in `bookId` before importing.
- For `entityType: "categories"`: deletes all user categories before importing.
- For `entityType: "books"`: deletes all user books except Main. Deleting Main is **not allowed** — it is silently preserved.
- For `entityType: "backup"`: clears transactions and categories only. **Books are never cleared** during backup restore — they are merged by ID.
- In preview mode, the `deleted` count reflects what **would be** deleted — nothing is actually removed.

### Validation rules

#### Transactions

| Field | Required | Rules |
|-------|----------|-------|
| `amount` | **yes** | Must be a number. |
| `dateTime` | no | Must be a valid ISO 8601 date string. Defaults to current date/time if missing or invalid. |
| `bookId` | no | Must reference an existing, visible book. Falls back to the top-level `bookId` parameter. |
| `categoryName` | no | If provided, must match an existing category name. |
| `originalCurrency` | no | If set, `originalAmount` and `exchangeRate` must also be set. |
| `originalAmount` | no | Required if `originalCurrency` is set. |
| `exchangeRate` | no | Required if `originalCurrency` is set. Must be a positive number. |
| `note` | no | Free text. |
| `id` | no | Controls upsert vs create. Empty/null treated as create. |

#### Categories

| Field | Required | Rules |
|-------|----------|-------|
| `name` | **yes** | Must be a non-empty string. |
| `recurring` | no | Boolean. Defaults to `false`. |
| `color` | no | Hex color string (e.g., `"#FF5733"`). |
| `icon` | no | Icon name string. |
| `id` | no | Controls upsert vs create. |

#### Books

| Field | Required | Rules |
|-------|----------|-------|
| `name` | **yes** | Must be a non-empty string. |
| `currency` | no | Currency code. Defaults to `null` if missing. |
| `status` | no | `"open"` or `"closed"`. Defaults to `"open"`. |
| `id` | no | Controls upsert vs create. |

#### Backup

- `version` must be present and must match a supported version (currently `1`).
- For unsupported versions: import is blocked with an error.
- `books`, `categories`, `transactions` arrays are validated in order.
- If a transaction references a category or book that fails validation, the transaction is skipped.

### Issue format

```json
{
  "row": 14,
  "field": "categoryName",
  "message": "Category \"Bogus\" not found",
  "severity": "error"
}
```

| Field | Description |
|-------|-------------|
| `row` | 1-based index of the problematic row in the request. `null` for top-level issues (e.g., invalid book, unsupported version). |
| `field` | The target field name that failed validation. `null` for general row-level issues. |
| `message` | Human-readable description. |
| `severity` | `"error"` (row is skipped) or `"warning"` (row is still processed). |

### Response (single entity type)

```json
{
  "data": {
    "created": 139,
    "updated": 0,
    "deleted": 0,
    "errors": 3,
    "warnings": 2,
    "issues": [
      { "row": 14, "field": "categoryName", "message": "Category \"Bogus\" not found", "severity": "error" },
      { "row": 52, "field": "dateTime", "message": "Invalid date: \"yesterday\"", "severity": "error" },
      { "row": 201, "field": "amount", "message": "Amount is required", "severity": "error" },
      { "row": 7, "field": null, "message": "Column \"Extra Col\" was ignored", "severity": "warning" },
      { "row": 88, "field": null, "message": "Exchange rate missing — only original currency was set", "severity": "warning" }
    ]
  }
}
```

| Field | Description |
|-------|-------------|
| `created` | Number of new records created. In preview mode, number that **would be** created. |
| `updated` | Number of existing records updated (via `id` match). |
| `deleted` | Only populated when `clearExisting: true`. Number of records that were/would-be deleted before import. Always 0 in non-clear imports. |
| `errors` | Number of rows skipped due to validation failures. |
| `warnings` | Number of non-fatal issues (rows still processed). |
| `issues` | Per-row detail for every error and warning. |

### Response (backup)

```json
{
  "data": {
    "books": {
      "created": 1,
      "updated": 1,
      "deleted": 0,
      "errors": 0,
      "warnings": 0,
      "issues": []
    },
    "categories": {
      "created": 3,
      "updated": 9,
      "deleted": 0,
      "errors": 0,
      "warnings": 0,
      "issues": []
    },
    "transactions": {
      "created": 120,
      "updated": 227,
      "deleted": 0,
      "errors": 3,
      "warnings": 2,
      "issues": [ ... ]
    }
  }
}
```

Each entity key contains the same `created`/`updated`/`deleted`/`errors`/`warnings`/`issues` shape as the single-entity response. Order of processing: `books` → `categories` → `transactions`.

### Errors

```json
// 400 — Missing required fields
{ "error": "entityType is required" }

// 400 — Invalid entity type
{ "error": "Unknown entityType: \"pets\". Must be transactions, categories, books, or backup." }

// 400 — Missing data for backup
{ "error": "data field is required for backup entityType" }

// 400 — Unsupported backup version
{ "error": "Unsupported backup version: 2. This app supports version 1." }

// 400 — Invalid backup schema
{ "error": "Backup data is malformed: missing 'books' array" }

// 400 — Missing rows
{ "error": "rows array is required for transactions entityType" }

// 400 — Missing bookId for transactions
{ "error": "bookId is required for transaction imports" }

// 401 — Unauthenticated
{ "error": "Unauthorized" }
```

### Notes

- Import is **partial-success** by design. Rows that pass validation are committed; rows that fail are skipped. The response tells you which rows failed and why.
- Clearing existing data with `clearExisting: true` **always preserves the Main book**.
- Books are never cleared during backup restore — they are always merged by ID.
- Row indices in issues are 1-based (matching spreadsheet row numbering).
- The `mapping` field is metadata only — it does not affect processing. All transformation from source column names to target field names happens client-side.
