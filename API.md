# API Reference

Base path: `/api`

Auth: Cookie-based (Identity). `/auth/login` and `/auth/whoami` are unauthenticated; everything else requires `[Authorize]`.

Error shape: `{ "error": "Human-readable message" }`

---

## Auth

### `POST /api/auth/login`

Signs the user in with a persistent cookie (7‑day sliding).

**Request body:**
```json
{
  "user":     "string",   // required
  "password": "string"    // required
}
```

**Responses:**
| Code | Body |
|------|------|
| `200` | `{ "message": "Login successful." }` |
| `401` | `{ "error": "Invalid username or password." }` |

---

### `POST /api/auth/logout`

Signs the user out. No body. Requires auth.

**Response `200`:**
```json
{ "message": "Logged out successfully." }
```

---

### `GET /api/auth/whoami`

Returns the current user name (or `"anonymous"` if not logged in).

**Response `200`:**
```json
{ "user": "username" }
```

---

## Ledger (Transactions)

All endpoints below require `[Authorize]`.

### `GET /api/ledger/transactions`

Paginated list of transactions, optionally filtered.

**Request query:**
| Param    | Type   | Required | Default | Notes |
|----------|--------|----------|---------|-------|
| page     | int    | no       | 1       | min 1  |
| pageSize | int    | no       | 20      | 1–1000 |
| book     | string | no       | —       | filter  |
| author   | string | no       | —       | filter  |
| category | string | no       | —       | filter  |

**Response `200`:**
```json
{
  "items": [
    {
      "id":       "guid",
      "value":    123.45,
      "category": "Groceries",
      "author":   "Alice",
      "book":     "Personal",
      "date":     "2026-05-27T12:00:00+00:00"
    }
  ],
  "totalCount": 100,
  "page":       1,
  "pageSize":   20
}
```

**Error `400`:** `{ "error": "Page must be 1 or greater." }` (or similar)

---

### `GET /api/ledger/transactions/{id:guid}`

Single transaction by ID.

**Response `200`:** Same item shape as above.

**Error `404`:** `{ "error": "Transaction with id '{id}' not found." }`

---

### `POST /api/ledger/transaction`

Create a new transaction.

**Request body:**
```json
{
  "value":    123.45,       // required, non-zero decimal
  "category": "Groceries",  // required
  "author":   "Alice",      // optional — defaults to current user
  "book":     "Personal",   // optional
  "notes":    "Weekly grocery run",  // optional
  "date":     "2026-05-27T12:00:00+00:00"  // optional — defaults to now
}
```

**Response `201`:**
```json
{
  "id":       "guid",
  "value":    123.45,
  "category": "Groceries",
  "author":   "Alice",
  "book":     "Personal",
  "notes":    "Weekly grocery run",
  "date":     "2026-05-27T12:00:00+00:00"
}
```

---

### `PUT /api/ledger/transactions/{id:guid}`

Replace a transaction entirely.

**Request body:**
```json
{
  "value":    99.99,        // required, non-zero decimal
  "category": "Transport",  // required
  "author":   "Bob",        // required
  "book":     "Business",   // optional
  "notes":    "Weekly grocery run",  // optional
  "date":     "2026-05-27T12:00:00+00:00"  // required
}
```

**Response `200`:** Updated item in the same shape as `POST`.

**Error `404`:** `{ "error": "Transaction with id '{id}' not found." }`

---

### `DELETE /api/ledger/transactions/{id:guid}`

Delete a transaction.

**Response `204`:** No body.

**Error `404`:** `{ "error": "Transaction with id '{id}' not found." }`

---

## Dashboard

Requires `[Authorize]`.

### `GET /api/dashboard?granularity={granularity}&...`

Aggregated view of transactions bucketed by time period.

**Request query:**
| Param       | Type         | Required | Default | Notes |
|-------------|--------------|----------|---------|-------|
| granularity | string       | **yes**  | —       | `daily`, `weekly`, `monthly`, or `yearly` |
| from        | date         | no       | —       | `YYYY-MM-DD` |
| to          | date         | no       | —       | `YYYY-MM-DD` |
| book        | string       | no       | —       | filter |
| author      | string       | no       | —       | filter |
| category    | string       | no       | —       | filter |
| page        | int          | no       | 1       | min 1 |
| pageSize    | int          | no       | 20      | 1–1000 |

**Response `200`:**
```json
{
  "items": [
    {
      "periodStart":     "2026-05-25",
      "book":            "Personal",
      "author":          "Alice",
      "category":        "Groceries",
      "sumValue":        350.00,
      "transactionCount": 5
    }
  ],
  "totalCount": 50,
  "page":       1,
  "pageSize":   20
}
```

**Errors `400`:**
- `{ "error": "Invalid granularity '{value}'. Valid values: daily, weekly, monthly, yearly." }`
- `{ "error": "Page must be 1 or greater." }`
- `{ "error": "PageSize must be 1 or greater." }`
- `{ "error": "PageSize must not exceed 1000." }`
- `{ "error": "The 'from' date must not be after the 'to' date." }`

## Categories

Requires `[Authorize]`.

### `GET /api/categories`

Returns the full list of categories sorted by `displayOrder` (ascending, nulls last), then by `name` alphabetically.

**Response `200`:**
```json
[
  {
    "id": "guid",
    "name": "Groceries",
    "color": "#22c55e",
    "displayOrder": 1,
    "icon": null
  }
]
```

---

### `POST /api/categories`

**Request body:**
```json
{
  "name": "Groceries",
  "color": "#22c55e",
  "displayOrder": 1,
  "icon": null
}
```

`name` is required. All other fields are optional.

**Response `201`:** Created category (same shape as GET item) + `Location` header.

**Errors:**
- `400` — validation failure (e.g. missing name)
- `409` — duplicate category name

---

### `PUT /api/categories/{id}`

Full replace.

**Request body:** Same shape as POST. All fields optional except `name`.

**Response `200`:** Updated category.

**Errors:** `400`, `404`, `409`

---

### `DELETE /api/categories/{id}`

**Response `204`:** No body.

**Error `404`.**

---

## Books

Requires `[Authorize]`.

### `GET /api/books`

Returns all books.

**Response `200`:**
```json
[
  {
    "id":       "guid",
    "name":     "Personal",
    "currency": "USD",
    "color":    "#22c55e",
    "status":   "active"
  }
]
```

---

### `POST /api/books`

Create a new book.

**Request body:**
```json
{
  "name":     "Personal",   // required, 1–100 chars
  "currency": "USD",        // required, 1–10 chars
  "color":    "#22c55e",    // optional
  "status":   "active"      // optional
}
```

**Response `201`:** Created book (same shape as GET item) + `Location` header.

**Errors:**
- `400` — validation failure (missing name/currency, name too long, currency too long)
- `409` — duplicate book name

---

### `PUT /api/books/{id:guid}`

Full replace of an existing book.

**Request body:** Same shape as POST. All fields optional except `name` and `currency`.

**Response `200`:** Updated book (same shape as GET item).

**Errors:**
- `400` — validation failure
- `404` — book not found
- `409` — duplicate book name

---

### `DELETE /api/books/{id:guid}`

Delete a book.

**Response `204`:** No body.

**Error `404`:** `{ "error": "Book with id '{id}' not found." }`