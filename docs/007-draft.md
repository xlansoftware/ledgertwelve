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
HistoryPage
├── Header
│   ├── Search Icon
│   └── Filter Button
│
├── TransactionGroupRow ("Today")
│── TransactionRow
│── TransactionRow
│── TransactionRow
│
├── TransactionGroupRow ("Yesterday")
│── TransactionRow
│── TransactionRow
│── TransactionRow
│
└── LoadMoreButton
```

---

# Data Model

```ts
export interface Transaction {
  id: string
  value: number
  currency: string
  category: string
  author: string
  book: string | null
  notes: string | null
  date: string
}

```

---

# Grouped Data Structure

```ts
export type TransactionGroup = {
  label: string
  items: Transaction[]
}
```

Example:

```ts
const groups: TransactionGroup[] = [
  {
    label: "Today",
    items: [...]
  },
  {
    label: "Yesterday",
    items: [...]
  }
]
```

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
    subtitle: "d.gencheva@xlansoftware.com",
    timestamp: "Today 08:53 AM",
    category: "Utilities",
    amount: 23.31,
    icon: <Plug />,
    accentColor: "#B7C2FF",
    type: "expense",
  }}
/>
```

---

# Component: `TransactionSection`

## Purpose

Renders grouped transactions.

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

```ts
const [transactions, setTransactions] = useState<Transaction[]>([])
const [page, setPage] = useState(1)
const [loading, setLoading] = useState(false)
const [hasMore, setHasMore] = useState(true)
```

---

# Pagination Rules

## Initial Load

Load first 100 transactions.

```ts
limit=100
offset=0
```

---

## Load More

When user presses button:

```ts
offset = page * 100
```

Append new transactions.

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
    transaction-section.tsx
    transaction-list.tsx
    load-more-button.tsx

/lib
  transaction-utils.ts

/types
  transaction.ts
```

---

# Suggested Utilities

## `groupTransactionsByDay`

```ts
function groupTransactionsByDay(
  items: Transaction[]
): TransactionGroup[]
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

Keyboard support:

* Enter
* Space

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
* `ScrollArea` (optional)
* `Separator` (optional)

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
  <TransactionSection label="Today">
    <TransactionRow />
    <TransactionRow />
  </TransactionSection>

  <TransactionSection label="Yesterday">
    <TransactionRow />
  </TransactionSection>

  <LoadMoreButton />
</TransactionList>
```
