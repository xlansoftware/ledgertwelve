# PRD: Add Transaction Page

**Status:** done
**Target file:** `frontend/src/pages/AddTransactionPage.tsx`  
**Date:** 2026-05-27

---

## 1. Problem statement

The current `AddTransactionPage` is a placeholder rendering a centered heading. Users need a fast, touch-friendly form to log financial transactions — entering an amount (with optional math/currency parsing), picking a category from a visual grid, and adding optional notes. The transaction is saved when the "Add" button is pressed.

---

## 2. User stories

- **As a user**, I want to type `"12.50 + 3"` and have the system compute `15.50` as the transaction amount, so I can log split bills without a calculator.
- **As a user**, I want to type `"22 USD"` and have the currency auto-detected, so I don’t need a separate currency dropdown.
- **As a user**, I want to tap a category button to select it, so I can categorize transactions with one tap on mobile.
- **As a user**, I want to submit the transaction and see it reflected in my history immediately.
- **As a user**, I want clear visual feedback when my input is invalid, without the page crashing.

---

## 3. Scope

### 3.1 In scope

| # | Item | Notes |
|---|------|-------|
| 1 | `AmountInput` component | Freeform text → parsed `{ amount, currency }` |
| 2 | `CategorySelector` component | Grid of `CategoryButton` items from `categoryStore` |
| 3 | `CategoryButton` sub-component | Icon + label, selected/unselected states |
| 4 | `AddTransactionPage` composition | Wire components, manage form state, call `transactionStore.addTransaction` |
| 5 | Client-side validation | Prevent submission when amount is null or no category selected |
| 6 | Integration with `transactionStore` | Call `addTransaction(CreateTransactionRequest)` on submit |
| 7 | Integration with `categoryStore` | Call `fetchCategories()` on mount |
| 8 | Loading & error states | Show spinner while categories load; show inline error on submit failure |
| 9 | Unit tests for `AmountInput` parsing | Cover all examples from the spec plus edge cases |
| 10 | Integration tests for the page | Happy path, validation errors, server error |
| 11 | MSW handler for `POST /api/ledger/transaction` | Already exists — verify it handles the parsed payload correctly |

### 3.2 Out of scope

- Editing or deleting transactions (that’s HistoryPage territory)
- Creating/editing categories (SettingsPage territory)
- Multi-currency conversion
- Auto-save drafts
- Animations or transitions beyond what Tailwind provides

---

## 4. Component architecture

```
AddTransactionPage
├── AmountInput             (new: frontend/src/components/AmountInput.tsx)
│   └── <input>             (freeform text, large font, mobile-optimized)
├── NotesInput              (inline in page — plain <Input>)
├── CategorySelector        (new: frontend/src/components/Category/CategorySelector.tsx)
│   └── CategoryButton[]    (new: frontend/src/components/Category/CategoryButton.tsx)
└── Submit button           (uses existing <Button> with label "Add")
```

### 4.1 Why separate components

`AmountInput` and `CategorySelector` are specified as reusable. Extracting them keeps the page thin and makes them testable in isolation. Implement `NotesInput` as plain `<Input>` with no parsing logic, keeping it inline.

---

## 5. Data model & API contract

### 5.1 Types (already exist)

```ts
// frontend/src/types/models.ts
interface Category {
  id: string
  name: string
  color: string | null
  displayOrder: number | null
  icon: string | null
}

// frontend/src/types/api.types.ts
interface CreateTransactionRequest {
  value: number        // parsed numeric amount (always positive; sign handled by backend)
  currency: string     // e.g. "USD", "EUR", "PLN"
  category: string     // category.name (not id — matches existing API contract)
  author?: string
  book?: string | null
  notes?: string | null
  date?: string        // ISO 8601 — omit to let backend use server time
}
```

**Key design decision:** `category` in `CreateTransactionRequest` is a `string`, not a `string` ID. The mock handler treats it as the category name. We pass `category.name` on submit.

### 5.2 Stores (already exist)

| Store | Relevant API | Used for |
|-------|-------------|----------|
| `useCategoryStore` | `categories`, `fetchCategories()`, `isLoading`, `error` | Populate category grid |
| `useTransactionStore` | `addTransaction(data)` | Submit transaction |
| `useUserStore` | `user` | Pre-fill `author` field |

### 5.3 API endpoint

```
POST /api/ledger/transaction
Body: CreateTransactionRequest
Response: 201 + Transaction
```

The MSW handler already supports this. No changes needed.

---

## 6. Component specifications

### 6.1 `AmountInput`

**File:** `frontend/src/components/AmountInput.tsx`

#### Props

```ts
type AmountInputProps = {
  value: string
  onChange: (value: string) => void
  onParsed?: (result: { raw: string; amount: number | null; currency?: string }) => void
  placeholder?: string
  autoFocus?: boolean
}
```

#### Parsing rules

A pure function `parseAmount(raw: string): { amount: number | null; currency?: string }` (NOT a React hook — testable in isolation).

| Rule | Example input | amount | currency |
|------|--------------|--------|----------|
| Plain number | `"42.50"` | `42.50` | — |
| Math expression | `"2 + 3"` | `5` | — |
| Math with parens | `"(10+5)/3"` | `5` | — |
| Currency suffix (space) | `"22 USD"` | `22` | `"USD"` |
| Currency prefix (space) | `"USD 22"` | `22` | `"USD"` |
| Currency suffix (no space) | `"22USD"` | `22` | `"USD"` |
| Currency prefix (no space) | `"USD22"` | `22` | `"USD"` |
| Currency before math | `"EUR 10 * 3"` | `30` | `"EUR"` |
| Currency after math | `"10 * 3 EUR"` | `30` | `"EUR"` |
| Math + currency (no space) | `"10*3EUR"` | `30` | `"EUR"` |
| Invalid expression | `"abc"` | `null` | — |
| Division by zero | `"10 / 0"` | `null` | — |
| Empty string | `""` | `null` | — |
| Negative result | `"5 - 10"` | `-5` | — |

**Currency tokens:** case-insensitive any three characters are ok.

**Math evaluation:** use `math.js` (already added as dependency) or a safe eval. Must handle:
- `+`, `-`, `*`, `/`
- Parentheses
- Floating-point values
- Error cases without throwing (return `null` amount)

**Implementation note:** The `parseAmount` function should:
1. Trim whitespace
2. Extract currency token from start or end (case-insensitive, with or without space separator)
3. Strip the currency token, then evaluate the remaining expression
4. If evaluation fails, return `{ amount: null }`

#### Behavior

- Calls `onChange` on every keystroke (controlled input)
- Calls `onParsed` with the parsed result on every change
- Does NOT crash on invalid input — renders normally, parsed amount is `null`
- Shows a subtle visual indicator when amount is `null` and input is non-empty (e.g., muted color or dashed border)
- `placeholder` defaults to `"Amount (e.g. 12.50 + 3, 22 USD)"`
- `autoFocus` defaults to `true` when used on AddTransactionPage

#### Visual style

- Font size: `text-3xl` or larger
- Full width
- `inputMode="decimal"` for mobile numeric keyboard
- No border on focus — clean, minimal appearance (borderless or bottom-border only)
- Rounded corners consistent with the design system

---

### 6.2 `CategoryButton`

**File:** `frontend/src/components/Category/CategoryButton.tsx`

#### Props

```ts
type CategoryButtonProps = {
  category: Category
  isSelected: boolean
  onSelect: (categoryId: string) => void
}
```

#### States

| State | Background | Border | Text | Icon area |
|-------|-----------|--------|------|-----------|
| Default | `bg-card` (white/light) | `ring-1 ring-border` | `text-foreground` font-normal | `bg-muted` circle |
| Selected | `bg-foreground` (dark) | `ring-2 ring-primary` | `text-primary-foreground` font-semibold | `bg-primary/20` circle or accent |

#### Content

- Category name displayed as label
- Icon placeholder: a circle/roundel showing first letter of category name (since `icon` is `null` in seed data), tinted with `category.color`
- Minimum touch target: `44px` height (Tailwind `h-11`)
- Rounded corners: `rounded-lg`

#### Accessibility

- `role="button"` or use `<button>` element
- `aria-pressed={isSelected}`
- `aria-label={category.name}`

---

### 6.3 `CategorySelector`

**File:** `frontend/src/components/Category/CategorySelector.tsx`

#### Props

```ts
type CategorySelectorProps = {
  categories: Category[]
  selectedCategoryId?: string
  onSelect: (categoryId: string) => void
}
```

#### Layout

- 2-column CSS grid: `grid grid-cols-2 gap-3`
- Scrollable if categories exceed viewport height
- No horizontal scrolling

#### Behavior

- Selecting a different category replaces the selection (single-select)
- Tapping the already-selected category deselects it (toggle)
- Categories sorted by `displayOrder` ascending, then by `name` alphabetically (same as store)

---

### 6.4 `AddTransactionPage`

**File:** `frontend/src/pages/AddTransactionPage.tsx`

#### State

```ts
const [amountRaw, setAmountRaw] = useState("")
const [parsedAmount, setParsedAmount] = useState<number | null>(null)
const [parsedCurrency, setParsedCurrency] = useState<string | undefined>(undefined)
const [notes, setNotes] = useState("")
const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined)
const [isSubmitting, setIsSubmitting] = useState(false)
const [submitError, setSubmitError] = useState<string | null>(null)
```

#### Lifecycle

1. **On mount:** call `categoryStore.fetchCategories()`
2. **Category loading:** show skeleton/spinner in place of category grid
3. **Category error:** show error message with retry button
4. **On submit:** validate → call `transactionStore.addTransaction(...)` → reset form or show error

#### Validation rules

| Rule | Error message |
|------|--------------|
| `parsedAmount` is `null` | "Please enter a valid amount." |
| `parsedCurrency` is undefined | "Please specify a currency (e.g. 22 USD)." |
| `selectedCategoryId` is undefined | "Please select a category." |

All validation runs **before** the API call. Errors display inline near the relevant field.

#### Submission

```ts
const handleSubmit = async () => {
  // 1. Validate
  if (parsedAmount === null) { setSubmitError("..."); return }
  if (!parsedCurrency) { setSubmitError("..."); return }
  if (!selectedCategoryId) { setSubmitError("..."); return }

  // 2. Build payload
  const category = categories.find(c => c.id === selectedCategoryId)
  if (!category) return

  const payload: CreateTransactionRequest = {
    value: parsedAmount,
    currency: parsedCurrency,
    category: category.name,     // <— category name, not ID
    author: user ?? undefined,
    notes: notes || null,
  }

  // 3. Submit
  setIsSubmitting(true)
  setSubmitError(null)
  try {
    await addTransaction(payload)
    // 4. Reset on success
    setAmountRaw("")
    setParsedAmount(null)
    setParsedCurrency(undefined)
    setNotes("")
    setSelectedCategoryId(undefined)
  } catch {
    setSubmitError("Failed to save transaction. Please try again.")
  } finally {
    setIsSubmitting(false)
  }
}
```

#### Layout

```
┌────────────────────────────────┐
│  Header (from AppLayout)       │
├────────────────────────────────┤
│                                │
│  [ AmountInput    ] [  Add  ] (disable while submitting) │
│  (large, autoFocus)            │
│                                │
│  [ Notes (optional)         ]  │
│  ( full-width )                │
│                                │
│  Categories                    │
│  ┌──────────┬──────────┐       │
│  │ 🛒 Groc. │ 🚌 Trans.│       │
│  ├──────────┼──────────┤       │
│  │ 🍽 Dining│ 🏠 Rent  │       │
│  ├──────────┼──────────┤       │
│  │ ⚙ Equip.│          │       │
│  └──────────┴──────────┘       │
│                                │
│  {submitError} (red text)      │
└────────────────────────────────┘
```

#### Spacing

- Page padding: `px-4 py-6`
- Vertical gap between sections: `gap-6`
- Max width: `max-w-lg mx-auto` (not full-width on desktop)
- Add button match the size of the AmountInput

---

## 7. File changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/AmountInput.tsx` | **Create** | AmountInput component + `parseAmount` utility |
| `frontend/src/components/Category/CategorySelector.tsx` | **Create** | Category grid |
| `frontend/src/components/Category/CategoryButton.tsx` | **Create** | Individual category button |
| `frontend/src/pages/AddTransactionPage.tsx` | **Rewrite** | Compose components + form logic |
| `frontend/src/pages/AddTransactionPage.test.tsx` | **Create** | Integration tests for the page |
| `frontend/src/components/AmountInput.test.tsx` | **Create** | Unit tests for parsing |
| `frontend/src/components/Category/CategorySelector.test.tsx` | **Create** | Unit tests for selection behavior |

No changes to stores, API layer, types, or mock handlers.

---

## 8. Test plan

### 8.1 `parseAmount` unit tests (AmountInput.test.tsx)

Export `parseAmount` as a named export for direct testing.

```
✓ returns amount for plain number ("42.50" → 42.50)
✓ returns amount for addition ("2 + 3" → 5)
✓ returns amount for subtraction ("10 - 3" → 7)
✓ returns amount for multiplication ("10 * 4" → 40)
✓ returns amount for division ("100 / 2" → 50)
✓ returns amount for parenthesized expression ("(10+5)/3" → 5)
✓ returns amount and currency for suffix with space ("22 USD" → 22, USD)
✓ returns amount and currency for prefix with space ("USD 22" → 22, USD)
✓ returns amount and currency for suffix no space ("22USD" → 22, USD)
✓ returns amount and currency for prefix no space ("USD22" → 22, USD)
✓ returns amount and currency for currency before math ("EUR 10 * 3" → 30, EUR)
✓ returns amount and currency for currency after math ("10 * 3 EUR" → 30, EUR)
✓ returns amount and currency for math + currency no space ("10*3EUR" → 30, EUR)
✓ returns null amount for invalid expression ("abc" → null)
✓ returns null amount for division by zero ("10 / 0" → null)
✓ returns null amount for empty string ("" → null)
✓ returns negative amount ("5 - 10" → -5)
✓ handles floating point ("3.33 * 3" → 9.99)
✓ returns amount for "33 EUR" (33, EUR)
✓ returns amount for "USD 22" (22, USD)
```

### 8.2 `CategorySelector` unit tests

```
✓ renders all categories as buttons
✓ highlights selected category
✓ calls onSelect when a category is clicked
✓ deselects when selected category is clicked again
```

### 8.3 `AddTransactionPage` integration tests

```
✓ renders AmountInput, notes field, category grid, and add button
✓ shows validation error when submitting with empty amount
✓ shows validation error when submitting with no currency
✓ shows validation error when submitting with no category
✓ calls addTransaction with correct payload on valid submit
✓ resets form after successful submit
✓ shows error message when API call fails
✓ disables add button while submitting
✓ pre-fills author from userStore
✓ shows loading state while categories are fetching
✓ shows category error state with retry
```

---

## 9. Edge cases & error handling

| Scenario | Behavior |
|----------|----------|
| Categories fail to load | Show error message + "Retry" button that re-calls `fetchCategories()` |
| User types garbage into AmountInput | Field shows normally; parsed amount is `null`; validation catches on submit |
| User submits with `value: 0` | Backend rejects with 400 "Transaction value cannot be zero." Show server error. |
| User submits duplicate (same amount, category, time) | Backend accepts it (no dedup). This is intentional — users may log identical transactions. |
| User is not authenticated | `AuthGate` redirects to `/login` before this page renders. No special handling needed. |
| Very long category list (20+) | Grid scrolls vertically. Submit button remains visible (sticky or below scroll). |
| Very long notes (500+ chars) | Input accepts it; backend may truncate or reject — we don't enforce client-side limit. |
| Network failure during submit | Catch `ApiError`, show "Failed to save transaction. Please try again." |

---

## 10. Dependencies & constraints

- **No new npm packages** — use `math.js` if already present; otherwise use a minimal safe expression evaluator (or `Function` constructor with whitelist).
- **Base UI components** — use existing `Button` and `Input` from `components/ui/`.
- **Tailwind only** — no inline styles.
- **TypeScript strict** — no `any`.
- **Stores** — read-only from `categoryStore`, `transactionStore`, `userStore`. Do not modify store interfaces.

---

## 11. Acceptance criteria

- [ ] Typing `"12.50 + 3"` and selecting a category, then submitting, creates a transaction with `value: 15.50`.
- [ ] Typing `"22 USD"` auto-detects currency as `USD`.
- [ ] Submitting with no amount shows a validation error.
- [ ] Submitting with no category shows a validation error.
- [ ] Form resets after successful submission.
- [ ] API errors display inline without crashing the page.
- [ ] Category grid shows all categories from the store.
- [ ] Selected category has visible highlight distinct from unselected.
- [ ] All tests pass (`npm run test`).
- [ ] Page works on viewport widths 320px–1920px.
- [ ] Page renders inside `AppLayout` at route `/add` without breaking the header or layout.