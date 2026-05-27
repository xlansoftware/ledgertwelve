# PRD: Category Lookup Table

## Problem Statement

Transactions currently store `Category` as a free-text string, with no mechanism to propose default values or suggest consistent naming. When users type a category manually, they may introduce typos or variants ("Groceries" vs "grocery" vs "Food"), making it harder to filter and group transactions consistently. The app also lacks the ability to assign colors to categories, which would help the UI visually distinguish spending types.

## Solution

Introduce a `Category` lookup table in the backend — a simple managed list of category names and color hints. The table is seeded with sensible defaults on first run and exposed through CRUD endpoints so users can add, rename, recolor, or delete categories to suit their workflow.

The `Transaction.Category` field remains a free-text string. The lookup table is purely a suggestion source for the UI — not a foreign key constraint. This keeps transactions independent of the category lifecycle: renaming or deleting a lookup entry never modifies existing transactions.

## User Stories

1. As a user creating a transaction, I want the UI to propose a drop-down of known categories with color indicators, so that I can categorise my transaction quickly and consistently.
2. As a user, I want to see categories listed with their assigned color, so that I can visually distinguish spending types at a glance.
3. As a user, I want to add a new category to the lookup table, so that I can customise my category list over time.
4. As a user, I want to rename an existing category, so that I can keep my category names meaningful without affecting historical transactions.
5. As a user, I want to change the color of a category, so that I can personalise the visual appearance of my categories.
6. As a user, I want to delete a category from the lookup table, so that I can remove unused or irrelevant categories from the suggestion list.
7. As a new user, I want sensible default categories to already exist on first login, so that I can start categorising transactions immediately without manual setup.
8. As a developer, I want the category list to be fetchable in a single call (no pagination), so that the frontend can cache and suggest categories without complex paging logic.
9. As a developer, I want the category endpoint to follow the same error shape and auth conventions as the rest of the API, so that error handling and auth middleware work consistently.

## Implementation Decisions

### Entity shape
- **Entity name:** `Category`
- **Fields:**
  - `Id` (Guid) — primary key
  - `Name` (string, max 100) — display name shown in the UI suggestion list; must be unique (case-insensitive)
  - `Color` (string, max 7, nullable) — hex colour code (e.g. `"#ef4444"`); when null, the UI falls back to a default grey (`#6b7280`)
  - `DisplayOrder` (int?, nullable) — sort order hint for the UI. Results are returned sorted by `DisplayOrder ASC`, then `Name ASC`, with `null` values sorted last. No database index is needed.
  - `Icon` (string, max 100, nullable) — key for an icon from the Huge Icons icon library (e.g. `"ShoppingBagAddIcon"`). The backend does not validate the icon key against any library — it is passed through to the UI, which renders a fallback icon if the key is unknown.

### No foreign key on Transaction
- `Transaction.Category` remains a free-text `string` with `HasMaxLength(100)`.
- No FK constraint between `Transaction` and `Category`. These are independent tables.
- This means:
  - **Renaming** a category only updates the lookup row. Existing transactions keep their original string value. A future bulk-rename feature (out of scope here) can optionally migrate old values.
  - **Deleting** a category is free. The entry disappears from the suggestion list, but transactions referencing that string remain intact.

### API endpoints
All endpoints require `[Authorize]` (consistent with the rest of the API).

| Method | Path | Request body | Response | Notes |
|--------|------|--------------|----------|-------|
| `GET` | `/api/categories` | — | `200` → array of category objects | Full list, no pagination. Sorted by `DisplayOrder ASC`, then `Name ASC`, nulls last. |
| `POST` | `/api/categories` | `{ name, color?, displayOrder?, icon? }` | `201` → created category + `Location` header | `name` is required; all other fields are optional. |
| `PUT` | `/api/categories/{id}` | `{ name, color?, displayOrder?, icon? }` | `200` → updated category | Full replace. All fields optional except `name`. |
| `DELETE` | `/api/categories/{id}` | — | `204` — no body | Free delete — no transactions are modified. |

**Category object shape:**
```json
{
  "id": "guid",
  "name": "Groceries",
  "color": "#ef4444",
  "displayOrder": 1,
  "icon": null
}
```

**Error responses** follow the existing `{ "error": "Human-readable message" }` pattern:
- `400` — validation failure (e.g. missing name, invalid colour format)
- `404` — category not found
- `409` — duplicate category name

### Global shared table
- The `Category` table is global across all users (no `UserId` column).
- Future per-user customisation would require a migration, but for MVP a single shared list keeps the implementation simple.

### Seed data
`DbInitializer` seeds a default set of categories on first run if the table is empty:

| #  | Name             | DisplayOrder | Color    | Icon             |
|----|------------------|--------------|----------|------------------|
| 1  | Groceries        | 1            | #fde68a  | shopping-cart    |
| 2  | Rent / Mortgage  | 21           | #fca5a5  | home             |
| 3  | Utilities        | 4            | #a5b4fc  | plug             |
| 4  | Transportation   | 6            | #bbf7d0  | car              |
| 5  | Insurance        | 17           | #fcd34d  | shield           |
| 6  | Dining Out       | 5            | #FFCAD4  | utensils         |
| 7  | Entertainment    | 8            | #bae6fd  | film             |
| 8  | Health / Medical | 10           | #FF595E  | heart            |
| 9  | Personal Care    | 11           | #ddd6fe  | smile            |
| 10 | Subscriptions    | 20           | #fde2e4  | credit-card      |
| 11 | Clothing         | 12           | #e0f2fe  | shirt            |
| 12 | Gifts            | 14           | #d9f99d  | gift             |
| 13 | Travel           | 13           | #a7f3d0  | plane            |
| 14 | Education        | 15           | #fef9c3  | book             |
| 15 | Savings          | 18           | #f0abfc  | piggy-bank       |
| 16 | Miscellaneous    | 9            | #FDFFB6  | dots-horizontal  |
| 17 | Pets             | 2            | #4d22b2  | heart            |
| 18 | Taxes            | 19           | #e22400  | edit             |
| 19 | Maintenance      | 3            | #ad3e00  | home             |
| 20 | Parents          | 16           | #3A86FF  | file             |
| 21 | Sport            | 7            | #F72585  | smile            |
| 22 | Kids             | 22           | #FF6B6B  | piggy-bank       |

### Modules to build / modify

**Domain (new file):** `Category` entity with `Id`, `Name`, `Color` properties and a private parameterless constructor for EF Core.

**Application (new files):**
- `ICategoryRepository` interface defining: `GetAllAsync`, `GetByIdAsync`, `AddAsync`, `UpdateAsync`, `DeleteAsync`
- DTOs: `CreateCategoryDto`, `UpdateCategoryDto`, `CategoryResponse`

**Infrastructure (modify + new):**
- `AppDbContext` — add `DbSet<Category> Categories` and entity configuration (max length, unique index on `Name`)
- `CategoryRepository` — EF Core implementation of `ICategoryRepository`
- `DbInitializer` — seed default categories after users are seeded
- New EF Core migration for the `Categories` table

**API (new file):**
- `CategoriesController` — CRUD endpoints mapping to `ICategoryRepository`

**Dependency injection (modify):**
- `Program.cs` — register `ICategoryRepository` → `CategoryRepository`

## Testing Decisions

### Test philosophy
Tests should cover the external behaviour of each module, not internal implementation details. A good test exercises a code path (happy path, validation, not-found, duplicate) through the module's public interface and asserts on the returned value or side-effect.

### Modules to test
- **`CategoryRepository`** (integration tests) — using the in-memory provider, following the pattern in `TransactionRepositoryTests`. Verify CRUD operations, duplicate name rejection, and that deleted entries are truly gone.
- **`CategoriesController`** (unit tests) — using mocked `ICategoryRepository`. Verify the correct HTTP status codes and response shapes for every endpoint: `200`, `201`, `204`, `400`, `404`, `409`.

### Prior art
- `TransactionRepositoryTests` in `ledger12.Tests/Integration/` — uses `UseInMemoryDatabase`, tests the repository against an isolated `AppDbContext`.
- `LedgerServiceTests` in `ledger12.Tests/Unit/` — uses Moq to mock repository dependencies and tests service methods in isolation.

## Out of Scope

- **Frontend management UI** — editing, adding, or deleting categories from the user interface is not part of this PRD. The frontend will consume the `GET /api/categories` endpoint for suggestion display, but the management interface (e.g. a Categories section in Settings) is a separate piece of work.
- **Bulk-rename of transactions** — renaming a category does not backfill existing transactions. A future feature may offer batch-renaming of transaction categories.
- **Per-user categories** — the table is global. User-specific customisation is deferred.


## API.md Update Instructions

Add a new `## Categories` section to `API.md` documenting all four endpoints with full request and response shapes.

```markdown
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
```

## Further Notes

- The colour field is a UI hint only. The backend does not validate that the colour matches any specific palette — any 7-character hex string is accepted.
- Similarly, the `icon` field is passed through without validation. The UI component renders a fallback/default icon if the key does not match any known icon.
- Because `Transaction.Category` is a free string, the category lookup is always optional and best-effort. The UI should gracefully handle the case where a transaction's category string does not match any entry in the lookup table.
