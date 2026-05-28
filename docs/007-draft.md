# HistoryPage.tsx

## Overview

Implement a mobile-first transaction history screen.

The screen displays:

* grouped transactions by date (`Today`, `Yesterday`, etc.)
* vertically scrollable list
* reusable `TransactionRow` component
* category/icon color indicators
* transaction amount aligned right
* contextual metadata
* incremental pagination using a `"Load more..."` button

Use:

* React
* TypeScript
* TailwindCSS
* shadcn/ui
* Lucide icons

---

# Screen Structure

```txt
TransactionScreen
├── Header
│   ├── Search Icon
│   └── Filter Button
│
├── TransactionGroupRow ("Today")
├── TransactionRow
├── TransactionRow
│
├── TransactionGroupRow ("Yesterday")
├── TransactionRow
│
└── LoadMoreButton
```

---

# Data Model

Defined in `frontend/src/types/models.ts`

```ts
export interface Transaction {
  id: string
  value: number
  category: string
  author: string
  book: string | null
  notes: string | null
  date: string
}
```

---

# Grouped Data Structure

Insert delimiter rows on the boundary of the list of transactions.

---

# Component: `TransactionRow`

## Purpose

Displays a single transaction item.

---

# Visual Layout

```txt
┌──────────────────────────────────────┐
│ ICON │ Title                Amount   │
│      │ Subtitle + Time               │
│      │ Category                      │
└──────────────────────────────────────┘
```

---

# Component API

```ts
type TransactionRowProps = {
  transaction: Transaction
  onClick?: () => void
}
```

---

# Styling Requirements

## Row Container

Use:

```txt
flex items-start gap-3
px-4 py-3
border-b
bg-background
```

Interactive states:

```txt
hover:bg-muted/40
active:bg-muted
cursor-pointer
transition-colors
```

---

## Left Icon Area

Fixed-width colored strip/background.

```txt
w-12 h-12
rounded-md
flex items-center justify-center
shrink-0
```

Background:

```ts
style={{ backgroundColor: transaction.accentColor }}
```

Icon:

```txt
w-5 h-5 text-primary-foreground
```

---

## Middle Content

```txt
flex-1 min-w-0
```

### Title Row

```txt
flex items-start justify-between gap-2
```

Title:

```txt
font-medium text-sm leading-none
truncate
```

Optional pending badge:

```txt
h-2 w-10 rounded-full bg-muted
```

---

## Metadata Row

```txt
mt-1
text-xs text-muted-foreground
```

Format:

```txt
{subTitle} · {timestamp}
```

Example:

```txt
d.gencheva@xlansoftware.com · Today 08:53 AM
```

---

## Category Label

```txt
mt-1
text-sm text-muted-foreground
```

---

## Amount

Right aligned.

```txt
text-right
font-semibold
text-base
tabular-nums
whitespace-nowrap
```

### Positive Amount

```txt
text-foreground
```

### Negative Amount

```txt
text-destructive
```

Formatting:

```ts
const formatted = Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(amount)
```

Examples:

```txt
23.31
-1,540.00
```

---

# TransactionRow Example

```tsx
<TransactionRow
  transaction={{
    id: "1",
    title: "Internet",
    subtitle: "demo@example.com",
    timestamp: "Today 08:53 AM",
    category: "Utilities",
    amount: 23.31,
    icon: <Plug />,
  }}
/>
```

---

# API

```ts
type TransactionSectionProps = {
  label: string
  items: Transaction[]
}
```

---

# Layout

Header:

```txt
px-4 py-2
text-sm font-medium
text-muted-foreground
bg-muted/30
sticky top-0
z-10
```

Rows:

```tsx
items.map(...)
```

---

# Main Screen Component

## Responsibilities

* fetch transactions
* maintain pagination state
* group by relative date
* append more transactions
* render sections

---

# State

Use `frontend/src/store/transactionStore.ts` to read

```ts
const [transactions, setTransactions] = useState<Transaction[]>([])
const [page, setPage] = useState(1)
const [loading, setLoading] = useState(false)
const [hasMore, setHasMore] = useState(true)
```

---

# Pagination Rules

## Initial Load

Load first 20 transactions.

```ts
pageSize=20
page=1
```

---

## Load More

When user presses button:

```ts
pageSize = pageSize + 20
```

If returned count `< 100`:

```ts
setHasMore(false)
```

---

# Load More Button

Place at bottom of list.

Use shadcn `Button`.

Centered layout:

```txt
flex justify-center py-6
```

Button variant:

```txt
variant="outline"
```

Label:

```txt
Load more...
```

Loading state:

```txt
Loading...
```

Disabled while fetching.

---

# Empty State

If no transactions:

```txt
flex flex-col items-center justify-center
py-16 text-center
```

Content:

```txt
No transactions found
```

Subtext:

```txt
Your transaction history will appear here.
```

---

# Recommended File Structure

```txt
/components
  /transactions
    transaction-row.tsx
    transaction-group-row.tsx
    transaction-list.tsx
    load-more-button.tsx

/lib
  transaction-utils.ts

```

---

# Suggested Utilities

## `groupTransactionsByDay`

```ts
function groupTransactionsByDay(
  items: Transaction[]
): (Transaction | string)[]
```

Should produce labels like:

* Today
* Yesterday
* Monday
* May 12

---

# Accessibility

## Row

Use:

```txt
role="button"
tabIndex={0}
```

---

# Mobile UX Notes

* rows should be minimum `64px` height
* preserve horizontal padding
* avoid wrapping amount text
* support inertial scrolling
* sticky section headers improve navigation

---

# shadcn Components to Use

* `Button`
* `ScrollArea`
* `Separator`

---

# Tailwind Notes

Preferred utility patterns:

```txt
truncate
min-w-0
tabular-nums
sticky
shrink-0
```

Avoid fixed widths except icon column.

---

# Example Rendering Flow

```tsx
<TransactionList>
  <TransactionGroupRow label="Today" />
  <TransactionRow />
  <TransactionRow />

  <TransactionGroupRow label="Yesterday" />
  <TransactionRow />

  <LoadMoreButton />
</TransactionList>
```
