# Ledger Twelve (ledger12) - Personal Ledger App

A responsive web application for tracking personal expenses and income by category. The app organises transactions into **books** (sub-ledgers), always anchored to a default **Main** book. Users can create temporary books (e.g., “Vacation 2026”) and eventually close them, rolling their net balance into Main. All reporting and trend analysis is based on the Main book.  

The app supports multi-user access, book sharing, multi-currency entry with user-provided exchange rates, and category management with optional recurring markers. The primary interface is optimised for mobile use, while reports are designed for larger screens.

---

## 2. Authentication & Multi‑User
- **Login:** Email and password authentication.
- **Architecture:** Fully web‑based; all data stored on the server. There is no offline‑first requirement.
- **Multi‑user & Sharing:**
  - Users own the books they create.
  - Books can be shared with other users. Both transactions and books record the user who created them.
  - Shared users have access to the book’s transactions (specific permissions to be defined later, but the core idea is collaborative tracking).

---

## 3. Books
A book is a named grouping of transactions, acting as a sub‑ledger. There is always exactly one **Main** book per user, created automatically.

### 3.1 Main Book
- Name: "Main".
- Cannot be deleted or closed.
- All reports (trends, totals, breakdowns) are derived **only** from the Main book. Other books serve as temporary scopes that eventually feed into Main upon closure.

### 3.2 Book Properties
- **Name** – free text (e.g., “Vacation 2026”).
- **Currency** – the base currency of the book (see §3.4).
- **Status** – open or closed.
- **Ownership & sharing** – the creator and list of users with whom the book is shared.

### 3.3 Closing & Reopening
- Any non‑Main book can be **closed** by its owner.
- When closing:
  1. The app calculates the **net balance** (sum of all income and expense transactions, taking sign into account) of the book.
  2. A new transaction is automatically created in the **Main** book with that net amount.
  3. The closing transaction’s **category** is chosen by the user at closing time (the UI prompts for it). The category can be edited later, like any other transaction.
  4. The transaction’s **note** is automatically set to `"Close <book name>"`.
- The closed book becomes **read‑only for entry** but remains fully visible. The UI warns the user that the book is closed.
- A closed book can be **reopened** at any time. Reopening does not delete or alter the closing transaction in Main—the user is responsible for adjusting it manually if needed.

### 3.4 Book Currency & Conversion
- Each book has a **base currency** (e.g., EUR, USD).
- Individual transactions can be recorded in a different currency. In that case, the user must provide an **exchange rate**.
- **UI assistance:** The app may fetch current exchange rates to suggest a value, but the final rate is always under the user’s control.
- The book currency **can be changed after creation**. The user is responsible for updating existing transaction values. The UI may assist with automatic recomputation and suggestions.
- **Simple mode:** If a transaction is added without specifying a foreign currency, it is assumed to be in the book’s currency directly—no conversion needed.

---

## 4. Transactions
A record of an expense or income. Income is represented as a value with opposite sign (positive for income, negative for expense, or vice versa, as the user sees fit).

### 4.1 Fields
- **Date/time** – when the transaction occurred.
- **Amount** – the converted value in the book’s currency (mandatory).
- **Currency & original amount** (optional) – the amount in the original transaction currency.
- **Exchange rate** – stored if conversion took place; the user provides it.
- **Category** – a reference to a category stored by value (see §5).
- **Note** – free‑text memo.
- **Metadata** – creator user, book reference, creation/edit timestamps.

### 4.2 Editing & Deletion
- Transactions can be edited at any time.
- When the amount changes, the app does **not** automatically recalculate the exchange rate; the user must update the rate if necessary. The UI should make it easy to adjust both the original amount and the rate.
- Deletion is allowed; no automatic adjustments to closing balances occur—the user maintains integrity.

### 4.3 Bulk Reassignment
- The app provides a feature to reassign **all transactions of a given category** to another category. This is available during category removal or as a standalone operation.

---

## 5. Categories
Categories classify transactions. They are **global per user**—the same set is available across all books.

### 5.1 Category Properties
- **Name** – a simple string (no nesting).
- **Recurring flag** – optional mark to indicate that expenses/income in this category are expected periodically (e.g., rent, salary). This flag is used only in reports to highlight expected recurring patterns; it does **not** generate automatic transactions.
- **Color** - string - an RGB color of the user interface.
- **Icon** - string - a key for the icon for the UI to display. 

### 5.2 Category Removal
- When a user deletes a category, existing transactions retain their category reference. The UI should assist the user in reassigning those transactions to another category (either immediately or later using the bulk reassignment feature).
- If the user chooses to delete without reassignment, the category simply disappears from selection lists; historical transactions are unchanged.

---

## 6. Main Interface & Reporting

### 6.1 “Add Transaction” as Home Screen
- The default screen on mobile is the **transaction entry form**, allowing immediate recording of an expense or income.
- At a minimum, the user selects: book, amount (and optionally currency/rate), category, date/time, and note.

### 6.2 Trends Screen
A dedicated reporting view, optimised for larger screens (tablets/desktops), offering:
- **Totals** per period: day, week, month, year.
- **Breakdown by category** for a chosen period.
- **Visualisations:** bar charts, line charts, pie charts.
- **Period comparison:** ability to compare a period (e.g., this month) against a previous one (last month, same month last year).
- **Recurring trends:** reports can highlight categories marked as recurring, showing trends versus expected recurring values if needed.
- All reports work exclusively on the **Main book**; closed‑book transactions are already reflected in Main via the closing entries.

---

## 7. Export
- **Formats:** CSV and Excel (XLSX).
- Users can export transaction data. The exact scope (per book, date range, entire Main) to be defined during detailed design, but the feature must exist.

---

## 8. Non‑Functional Notes
- The app is a **responsive web application**, primarily used on mobile phones, with reports optimised for desktop/tablet.
- All data resides on the server; multi‑device access is inherent.
- Data encryption at rest and advanced privacy measures are **out of scope** for the current definition.
