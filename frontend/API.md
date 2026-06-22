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
  "createdAt": "2026-01-01T10:00:00Z"
}
```

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
  "createdAt": "2026-01-01T10:00:00Z"
}
```

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

  "createdAt": "2026-05-01T12:00:00Z"
}
```

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
    "status": "open"
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

### Response

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

All reporting uses Main book only.

I would implement reports as read-only query endpoints.

---

# GET /api/v1/reports/totals

### Query

```text
period=month
from=2026-01-01
to=2026-12-31
```

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

---

# GET /api/v1/reports/categories

### Query

```text
period=month
from=2026-05-01
to=2026-05-31
```

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
- Uses Main book only.

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
- Uses Main book only.

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

### Semantics

Server computes `SUM(amount) / COUNT(days_with_transactions)` for Main-book transactions whose `date` is `>= from` and `< to`. Days with no transactions are not counted — they contribute zero to the sum but do not inflate the divisor.

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

### Request

```json
{
  "format": "xlsx",
  "bookId": "book_main",
  "from": "2026-01-01",
  "to": "2026-12-31"
}
```

### Response

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

---

# GET /api/v1/exports/{jobId}/download

### Purpose

Download generated CSV/XLSX.

### Response

```http
200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

---
