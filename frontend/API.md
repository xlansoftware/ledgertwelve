# API Reference

Base path: `/api/v1`

Auth: Cookie-based (Identity). `/api/v1/auth/login` and `/api/v1/auth/whoami` are unauthenticated; everything else requires `[Authorize]`.

Error shape: `{ "error": "Human-readable message" }`

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
category=
createdBy=
page=
pageSize=
```

Example:

```text
GET /transactions?bookId=book_1&from=2026-01-01&to=2026-12-31
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
