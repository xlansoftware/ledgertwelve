# PRD: Transaction History Page

Status: draft

---

## Overview

Replace the placeholder `HistoryPage` with a mobile-first, paginated transaction history screen that groups transactions by relative date.

---

## Screen Structure

```
HistoryPage
├── Header (placeholder — search/filter deferred)
│   ├── Search Icon (non-functional)
│   └── Filter Button (non-functional)
│
├── TransactionList (layout wrapper)
│   ├── TransactionGroupRow ("Today")
│   ├── TransactionRow xN
│   ├── TransactionGroupRow ("Yesterday")
│   ├── TransactionRow xN
│   ├── ...
│   └── LoadMoreButton
│
├── ErrorState (no cached data)
├── SkeletonList (initial load)
└── EmptyState (no transactions at all)
```

---

## Data Model

Uses the existing `Transaction` type from `types/models.ts`:

```ts
interface Transaction {
  id: string
  value: number
  category: string
  author: string
  book: string | null
  notes: string | null
  date: string
}
```

### TransactionRow Display Mapping

| Visual Field | Source |
|---|---|
| **Title** | `transaction.notes \|\| transaction.category` |
| **Subtitle** | `transaction.author` |
| **Timestamp** | Formatted from `transaction.date` (relative: "Today 08:53 AM") |
| **Category label** | `transaction.category` |
| **Amount** | `transaction.value` (formatted with `Intl.NumberFormat("en-US", { minFrac: 2, maxFrac: 2 })`) |
| **Icon/color** | Resolved by parent from `categoryStore`; generic colored square |

---

## File Structure

```
components/transactions/
├── transaction-row.tsx
├── transaction-group-row.tsx
├── transaction-list.tsx
└── load-more-button.tsx

lib/
└── transaction-utils.ts
```

---

## Components

### `TransactionRow`

```ts
type TransactionRowProps = {
  transaction: Transaction
  categoryColor: string | null
  onClick?: () => void    // wired later — not functional in this PRD
}
```

#### Visual Layout

```
┌──────────────────────────────────────┐
│ ICON │ Title                Amount   │
│      │ Author · Timestamp            │
│      │ Category                      │
└──────────────────────────────────────┘
```

#### Styling

- Container: `flex items-start gap-3 px-4 py-3 border-b bg-background`
- Interactive: `hover:bg-muted/40 active:bg-muted cursor-pointer transition-colors`
- Icon area: `w-12 h-12 rounded-md flex items-center justify-center shrink-0` with `backgroundColor: categoryColor`
- Generic icon: `w-5 h-5 text-primary-foreground`
- Middle: `flex-1 min-w-0`
- Title: `font-medium text-sm leading-none truncate`
- Subtitle: `text-xs text-muted-foreground` — format: `{author} · {relativeTimestamp}`
- Category: `text-sm text-muted-foreground mt-1`
- Amount: `text-right font-semibold text-base tabular-nums whitespace-nowrap` — positive: `text-foreground`, negative: `text-destructive`
- Minimum row height: `64px`
- Role: `role="button" tabIndex={0}`

---

### `TransactionGroupRow`

```ts
type TransactionGroupRowProps = {
  label: string
}
```

Styled as: `px-4 py-2 text-sm font-medium text-muted-foreground bg-muted/30 sticky top-0 z-10`

---

### `LoadMoreButton`

```ts
type LoadMoreButtonProps = {
  onClick: () => void
  isLoading: boolean
  hasMore: boolean
}
```

- When `!hasMore` — render nothing
- When `isLoading` — show "Loading..." (disabled, shadcn `Button variant="outline"`)
- Otherwise — show "Load more..." (shadcn `Button variant="outline"`)
- Layout: `flex justify-center py-6`

---

### `TransactionList`

Pure layout wrapper. Renders `children`. No data logic.

---

## State Management

### Store Extension (`transactionStore`)

Add append mode to `fetchTransactions`:

```ts
fetchTransactions({ append?: boolean })
```

| Detail | Value |
|---|---|
| Default `append` | `false` (replaces list, resets page to 1) |
| When `append=true` | Increments `page` by 1 before fetch, concatenates new items to existing list |
| `hasMore` | `(page * pageSize) < totalCount` |

### HistoryPage Orchestration

- On mount: `fetchTransactions({ append: false })`
- On "Load more": `fetchTransactions({ append: true })`
- Category colors resolved via `useCategoryStore()` — look up `category.color` by `transaction.category`
- Grouping via pure utility function (see below)

---

## Utilities (`lib/transaction-utils.ts`)

### `groupTransactionsByDay(items: Transaction[]): (Transaction | string)[]`

Produces labels in order of precedence:

1. "Today" — same calendar date
2. "Yesterday" — one calendar day before today
3. Day name (e.g., "Monday") — any day within the current week
4. "May 12" — month + day; include year if not current calendar year

Flattened array alternates string labels with transactions.

---

## Loading States

### Initial Load (no data yet)

Show `<SkeletonList>` — 5-6 rows of shimmer placeholders matching `TransactionRow` dimensions. No grouped headers.

### Load More

`LoadMoreButton` shows "Loading..." (disabled, spinner). Existing rows remain visible.

### Refreshing

Not in scope for this PRD.

---

## Empty State

When no transactions exist (`totalCount === 0` and no filters active):

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <p className="text-lg font-medium">No transactions yet</p>
  <p className="text-sm text-muted-foreground mt-1">
    Create your first transaction to get started.
  </p>
  <Button asChild className="mt-4" variant="default">
    <Link to="/add">Add Transaction</Link>
  </Button>
</div>
```

---

## Error State

| Condition | UX |
|---|---|
| Error + no cached data | Full-page error: message + "Retry" button that calls `fetchTransactions({ append: false })` |
| Error + cached data exists | Banner above list: message + "Retry" button. Existing data remains visible |

---

## Pagination API Details

Consumes `GET /api/ledger/transactions?page=N&pageSize=20` from `services/api.ts`.

Response shape:

```json
{
  "items": [...],
  "totalCount": 100,
  "page": 1,
  "pageSize": 20
}
```

---

## Accessibility

- `TransactionRow`: `role="button" tabIndex={0}`
- `LoadMoreButton`: standard shadcn button with disabled state
- Mobile: minimum `64px` row height, preserve horizontal padding, avoid wrapping amount, support inertial scrolling

---

## Out of Scope (follow-up issues)

1. Search/filter header functionality
2. Transaction row click action (detail view / edit)
3. Pull-to-refresh
4. Category-specific Lucide icons
5. Filter-clear empty state ("No transactions match your filters")

---

## Dependencies

- shadcn `Button` — already in project
- shadcn `ScrollArea`, `Separator` — may be used but not required
- Tailwind utilities: `truncate`, `min-w-0`, `tabular-nums`, `sticky`, `shrink-0`
- Zustand store — already in project
- Lucide icons — already in project