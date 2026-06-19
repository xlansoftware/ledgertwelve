# 001 — Currency Conversion Dialog

**Status:** `ready-for-agent`
**Date:** 2026-06-18

---

## Problem Statement

When a user adds a transaction in a currency different from the current book's currency, the application currently hard-codes the exchange rate to `1.0`. There is no way for the user to specify the actual exchange rate, and no default rate is fetched. This means multi-currency transactions are silently incorrect.

The user needs a way to review and set the exchange rate before the transaction is committed, with a reasonable default value fetched from the server.

---

## Solution

When the user enters an amount with a currency that differs from the book's currency and presses **Add**, a dialog appears showing:

- The **original amount and currency** (read-only, informational)
- An **exchange rate** pre-filled from the server's exchange rate API
- The **converted amount** in the book's currency

The user can edit either the rate or the converted amount — editing one automatically recalculates the other. The user presses **Confirm** to commit the transaction with the proper rate and converted amount. On mobile, the dialog renders as a bottom sheet for better reachability.

When the currency matches the book's currency, the dialog is skipped entirely (same behavior as today).

---

## User Stories

1. As a user entering a transaction in a foreign currency, I want to see a conversion dialog when I press Add, so that I can verify and adjust the exchange rate before the transaction is saved.

2. As a user, I want the exchange rate to be pre-filled with a suggestion from the server, so that I don't have to look it up manually.

3. As a user, I want to be able to override the suggested rate, so that I can use my own rate if the server's rate is outdated or incorrect.

4. As a user, I want to type the final converted amount directly, so that I can match the exact amount shown on my bank statement without manual calculation.

5. As a user, I want the exchange rate to update automatically when I type the converted amount, so that the fields stay consistent.

6. As a mobile user, I want the conversion form to appear as a bottom sheet, so that all controls are within easy thumb reach.

7. As a user entering an amount in the same currency as the book, I want no dialog to appear, so that I am not interrupted for unnecessary conversions.

8. As a user of a book with no currency set, I want no dialog to appear, so that my flow remains unchanged.

9. As a user, I want to see a clear label showing what the rate means (e.g., "1 USD = 0.91 EUR"), so that I don't confuse the direction of the conversion.

10. As a user, I want to cancel out of the dialog and return to the amount input, so that I can correct a mistake without committing a wrong transaction.

11. As a user, I want the Confirm button to be disabled when either the rate or converted amount field is empty, so that I cannot accidentally submit incomplete data.

12. As a user, I want to press Enter to confirm the dialog, so that I can complete the flow quickly from the keyboard.

13. As a user, I want the rate field to be auto-focused when the dialog opens, so that I can immediately adjust it if needed.

14. As a user, I want the dialog to show a loading state while the rate is being fetched, so that I know the application is working.

15. As a user, I want to see an error message in the dialog if the rate fetch fails, so that I know I need to enter the rate manually.

16. As a user, I want to type only digits and a decimal point in the numeric fields, so that I don't accidentally enter invalid characters.

17. As a user entering a negative amount (expense), I want the dialog to handle the negative values correctly, so that conversions work for expenses too.

18. As a user, I want the converted amount displayed with 2 decimal places, so that it matches standard currency formatting.

19. As a user, I want the exchange rate displayed with 4 decimal places, so that it has sufficient precision for accurate conversions.

---

## Implementation Decisions

### Overall flow

The existing `AddPage` intercepts the transaction in `handleAdd`. When the parsed `originalCurrency` exists, the book has a `currency`, and they differ, the conversion dialog opens. On dialog confirm, the transaction is created with the correct `amount` (book-currency value), `originalAmount`, `originalCurrency`, and `exchangeRate`. Same-currency or no-book-currency cases proceed directly without the dialog.

The `AmountInput` component requires no changes — it remains a dumb input parser.

### Modules

#### `useConvertDialogState` hook (new)

A custom hook that encapsulates all conversion logic. This is the deep module of the feature — independently testable with no DOM.

**Inputs:**
- `originalAmount` (number)
- `originalCurrency` (string)
- `bookCurrency` (string)
- `open` (boolean)

**Outputs:**
- `rate` and `setRate` — controlled string for the rate input
- `converted` and `setConverted` — controlled string for the converted amount input
- `isLoading` — true while the rate API is in flight
- `error` — string or null, set when the API call fails
- `isValid` — true when both fields are non-empty
- `getResult()` — returns `{ amount, originalAmount, originalCurrency, exchangeRate }` with full-precision numbers

**Internal logic:**
- Fetches `getExchangeRate({ from: originalCurrency, to: bookCurrency })` when `open` becomes true (only when currencies differ)
- Two-way editing: changing `rate` recalculates `converted = originalAmount × rate`; changing `converted` recalculates `rate = |converted| / |originalAmount|`
- Rate calculation always uses absolute values (rate is always positive); signs carry through the converted amount
- Rate is rounded to 4 decimal places for display, converted amount to 2 decimal places
- Non-numeric input is prevented at the keystroke level: rate field allows only digits and `.`, converted amount also allows `-` at position 0
- `getResult()` returns un-rounded, full-precision numeric values

#### `ConvertDialog` component (new)

A single component that renders the conversion form. Internally uses `useMediaQuery("(max-width: 768px)")` to switch between:
- **Desktop**: shadcn `Dialog` (centered modal)
- **Mobile**: shadcn `Sheet` with `side="bottom"` (bottom sheet)

Props contract:

```
{ open, onOpenChange, originalAmount, originalCurrency, bookCurrency, onConfirm }
```

Where `onConfirm` receives:

```
{ amount: number, originalAmount: number, originalCurrency: string, exchangeRate: number }
```

Layout follows shadcn form patterns using `FieldGroup` and `Field`:

- **Original amount field**: `Input` with `readOnly` and `disabled`, displays the original amount and currency with a lock indicator
- **Exchange rate field**: Editable `Input` with `autoFocus`, labeled "1 USD = ___ EUR" style, with `FieldDescription` repeating the full rate
- **Converted amount field**: Editable `Input`, labeled "Amount in [BOOK_CURRENCY]"
- **Footer**: Cancel button (closes dialog) and Confirm button (calls `onConfirm`, disabled when `!isValid`)
- **Error state**: `FieldError` displayed inline when the rate API fails
- **Loading state**: `Skeleton` on the rate field while fetching
- **Keyboard**: Enter in any field triggers confirm; Tab moves between fields

The component passes props directly to `useConvertDialogState` and maps its outputs to the form fields. The state hook owns all logic; the component is purely presentational.

#### `AddPage` (modified)

Changes to `handleAdd`:
1. Parse transaction from `AmountInput` as before
2. If `originalCurrency` exists, `book.currency` exists, and they differ → store the pending transaction in component state, open the dialog, return
3. Otherwise → proceed to `createTransaction` with `exchangeRate: 1.0` (same as current behavior)

On dialog confirm: call `createTransaction` using the `ConvertResult` values plus the stored `notes` and `selectedCategory`.

On dialog cancel: close the dialog, clear pending transaction. User returns to the amount input.

#### shadcn components (add)

- `dialog` — desktop modal
- `sheet` — mobile bottom sheet

Both use the project's existing Base UI foundation, no new dependencies.

### API contract

No changes. The feature uses:

- `GET /api/v1/rates/exchange?from=X&to=Y` — to fetch the default rate (already documented and mocked)
- `POST /api/v1/transactions` — to create the transaction with `originalCurrency`, `originalAmount`, `exchangeRate` fields (already supported)

### Precision and rounding

| Display value | Rounding | Storage (sent to API) |
|---|---|---|
| Converted amount | 2 decimal places | Full precision |
| Exchange rate | 4 decimal places | Full precision |

The display rounding is for UX only. Calculations use the stored full-precision values to prevent drift during two-way editing.

### Edge cases handled

| Scenario | Behavior |
|---|---|
| Same currency as book | Skip dialog, exchangeRate = 1.0 |
| Book has no currency | Skip dialog, exchangeRate = 1.0 |
| Rate API fails | Show inline error, rate field empty, user enters manually |
| Rate API returns 1.0 for unknown pair | Show as-is, user can override |
| Negative amounts | Math applies correctly; rate always displayed as positive (calculated with absolute values) |
| Clear rate field | Converted field shows empty, Confirm disabled |
| Clear converted field | Rate reverts to API default, Confirm disabled |
| Zero amount | Rate = 0, valid entry |
| User types "0" as converted | Rate = 0, valid entry |

---

## Testing Decisions

### What makes a good test
- Test external behavior, not internal state
- For the hook: test inputs in → outputs out, no mocking of internal functions
- For the component: test user-visible elements and interactions, use MSW for API calls

### Modules to test

#### `useConvertDialogState` (unit tests)

- Two-way editing: editing rate → converted updates correctly
- Two-way editing: editing converted → rate updates correctly
- Negative amounts: sign preserved in converted, rate stays positive
- Validation: isValid is false when rate is empty, when converted is empty
- getResult returns full-precision numbers
- Rounding: rate displayed to 4dp, converted to 2dp
- Multiple edits back and forth maintain consistency (no drift)
- Rate fetch triggered on open, not before
- Loading state transitions: isLoading → false when fetch completes
- Error state when fetch fails

#### `ConvertDialog` (integration tests)

- Renders with pre-filled rate and converted amount when API responds
- Shows skeleton/loading state while fetching
- Shows error message when API fails
- Edit rate field → converted amount updates
- Edit converted amount field → rate updates
- Confirm button disabled when rate is cleared
- Confirm button disabled when converted is cleared
- Confirm calls onConfirm with correct values
- Cancel calls onOpenChange(false)
- Keyboard: Enter confirms
- Mobile: renders as Sheet with side="bottom"
- Desktop: renders as Dialog
- Original amount field is read-only and disabled

### Prior art

- `AddPage.test.tsx` — uses React Testing Library + MSW, same pattern for dialog tests
- `categoriesService.test.ts` — unit tests for service functions, similar isolation approach for hook tests

---

## Out of Scope

- Editing exchange rates on existing transactions
- Persistent user rate preferences or rate history
- Multi-currency display in the transaction list
- Currency conversion in reports
- Support for cryptocurrency or non-ISO currency codes beyond what the exchange rate API handles
- Offline rate caching
- Automatic rate refresh (live rates)
- Rate input via other formats (e.g., "1 EUR = 1.10 USD" inverted direction)

---

## Further Notes

- The dialog uses `useMediaQuery` for responsive switching, which reads from `window.matchMedia` via `useSyncExternalStore` — this is already in the codebase at `src/hooks/use-media-query.ts`.
- The shadcn `Dialog` and `Sheet` both wrap Base UI's `Dialog` primitive, so they share the same controlled open/close API, making the responsive switch straightforward.
- The `FieldGroup` + `Field` form pattern is mandated by the project's shadcn conventions. Existing `Field` component already supports `data-invalid` and `aria-invalid` for error states.
- The exchange rate endpoint is documented as unauthenticated in API.md, which may require a future fix to `ratesService.ts` to bypass auth — but that is pre-existing and out of scope for this feature.
