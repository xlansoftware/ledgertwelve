# Expense Entry UI — Component Specification

## Overview

This interface is an expense entry form designed for quick financial logging. It consists of two reusable React components:

1. **AmountInput** — a smart text input that accepts:

   * mathematical expressions
   * currency values
   * mixed formatted monetary input

2. **CategorySelector** — a grid of selectable category buttons.

The UI emphasizes:

* fast data entry
* touch-friendly controls
* visual category recognition
* reusable and isolated component architecture

---

# 1. `AmountInput` Component

## Purpose

A reusable input component for entering expense amounts using:

* plain numbers
* mathematical expressions
* currency strings

Examples:

* `"2 + 3"`
* `"22 USD"`
* `"33 EUR"`
* `"12.50 * 4"`
* `"100 / 2"`

---

## Responsibilities

The component should:

* accept freeform text input
* parse math expressions
* recognize currency suffixes
* calculate the numeric result
* emit structured values to parent components

---

## Suggested Props

```ts
type AmountInputProps = {
  value: string;
  onChange: (value: string) => void;

  onParsed?: (result: {
    raw: string;
    amount: number | null;
    currency?: string;
  }) => void;

  placeholder?: string;
  autoFocus?: boolean;
};
```

---

## Parsing Rules

### Math Expressions

Supported operators:

* `+`
* `-`
* `*`
* `/`
* parentheses

Examples:

| Input          | Parsed Amount |
| -------------- | ------------- |
| `2 + 3`        | `5`           |
| `10 * 4`       | `40`          |
| `(10 + 5) / 3` | `5`           |

---

### Currency Recognition

The component should detect optional currency suffixes.

Examples:

| Input     | Amount | Currency |
| --------- | ------ | -------- |
| `22 USD`  | `22`   | `USD`    |
| `33 EUR`  | `33`   | `EUR`    |
| `100 PLN` | `100`  | `PLN`    |

---

## Suggested Internal State

```ts
type ParsedValue = {
  raw: string;
  amount: number | null;
  currency?: string;
};
```

---

## UX Requirements

### Input Behavior

* large font size
* optimized for mobile numeric entry
* immediate parsing feedback
* invalid expressions should not crash the component

---

### Notes Field

A secondary optional text field:

* plain string input
* accepts notes/descriptions
* no parsing required

Suggested prop:

```ts
type NotesInputProps = {
  value: string;
  onChange: (value: string) => void;
};
```

---

# 2. `CategorySelector` Component

## Purpose

Displays selectable expense categories as button cards.

Each category:

* contains icon + label
* supports active/selected state
* behaves like a toggle button

---

## Suggested Props

```ts
type Category = {
  id: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
};

type CategorySelectorProps = {
  categories: Category[];

  selectedCategoryId?: string;

  onSelect: (categoryId: string) => void;
};
```

---

## Layout

### Grid Structure

* responsive 2-column layout
* equal-width buttons
* vertical spacing between rows
* optimized for touch devices

---

## Button States

### Default

* white/light background
* bordered container

### Selected

* dark/high-contrast background
* highlighted icon section
* bold text

---

## Categories Displayed

Examples from the UI:

* Groceries
* Pets
* Maintenance
* Utilities
* Dining Out
* Transportation
* Sport
* Entertainment
* Miscellaneous
* Health / Medical
* Personal Care
* Clothing
* Travel
* Gifts
* Education
* Parents
* Insurance
* Savings
* Taxes
* Subscriptions
* Rent / Mortgage
* Kids

---

## Suggested Category Shape

```ts
const categories: Category[] = [
  {
    id: "groceries",
    label: "Groceries",
    icon: <CartIcon />,
    color: "#F4D35E",
  },
];
```

---

# Recommended Component Structure

```txt
ExpenseEntryForm
├── AmountInput
├── NotesInput
└── CategorySelector
```

---

# Suggested State Flow

```ts
const [amountInput, setAmountInput] = useState("");
const [notes, setNotes] = useState("");
const [selectedCategory, setSelectedCategory] = useState<string>();
```

---

# Recommended Parsing Strategy

Use:

* `mathjs`
* or a lightweight expression parser

Example:

```ts
evaluate("2 + 3"); // 5
```

Currency extraction can be handled via regex:

```ts
const match = input.match(/^(.+?)\s([A-Z]{3})$/);
```

---

# Accessibility Requirements

## Buttons

Each category button should include:

```tsx
aria-pressed={selected}
```

---

## Keyboard Navigation

Support:

* Tab navigation
* Enter/Space selection

---

# Mobile UX Considerations

* minimum touch target: `44px`
* avoid tiny icons
* maintain strong selected-state contrast
* smooth scrolling for long category lists

---

# Visual Design Characteristics

The interface uses:

* rounded corners
* soft shadows
* pastel category accents
* bold selected states
* high spacing readability
* large interactive controls

---

# Suggested File Structure

```txt
/components
  /AmountInput
    AmountInput.tsx
    AmountInput.types.ts
    AmountInput.styles.ts

  /CategorySelector
    CategorySelector.tsx
    CategoryButton.tsx
    CategorySelector.types.ts
    CategorySelector.styles.ts
