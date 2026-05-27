# PRD: Zustand Transaction Store

## Problem Statement

The ledger (transactions) page currently has no shared state management for the transaction list. Each page that needs transaction data either calls `api.ts` directly or would have to manage its own local state, leading to duplicated logic for pagination, filtering, loading states, and error handling. As the app grows with more pages that display or manipulate transactions (History, Dashboard, Add Transaction), the lack of a central store creates inconsistency and maintenance overhead.

## Solution

A single Zustand store (`useTransactionStore`) that owns the transaction list, pagination state, active filters, and CRUD operations. Components interact with the store through six actions and read reactive state — no local state duplication, no manual cache management. The store handles optimistic updates for deletions and edits, re-fetches to reconcile with the server, and guards against stale responses from rapid filter changes.

## User Stories

1. As a user, I want to see the transaction list load when I navigate to the History page, so that I can review my transactions.
2. As a user, I want to see a loading indicator while transactions are being fetched, so that I know the app is working.
3. As a user, I want to see an error message if the transaction list fails to load, so that I know something went wrong.
4. As a user, I want to filter transactions by book, author, category, and currency, so that I can narrow down the list to what I care about.
5. As a user, I want to see filters applied immediately when I change them, so that the list updates without a page reload.
6. As a user, I want changing a filter to reset pagination to page 1, so that I see results from the start.
7. As a user, I want to navigate between pages of the transaction list, so that I can browse beyond the first page.
8. As a user, I want to add a new transaction and see it appear in the list immediately, so that I have instant feedback.
9. As a user, I want to edit an existing transaction and see the changes reflected in the list instantly, so that I can quickly correct mistakes.
10. As a user, I want to delete a transaction and see it disappear from the list instantly, so that the UI feels responsive.
11. As a user, I want the transaction list to reconcile with the server after every add/edit/delete, so that the displayed data stays accurate.
12. As a user, I want to see an error message if an add/edit/delete operation fails, so that I know to retry.
13. As a user, I want rapid filter changes to produce the correct final result, not show stale data from an earlier request.

## Implementation Decisions

### Store scope (Hybrid)

The store owns the transaction list view — items, pagination, filters, loading, and error state. All five CRUD operations are exposed as store actions. Get-by-id (single transaction detail) is not in the store — it is handled by direct `api.getTransaction()` calls in the consuming page.

### State shape

The store exposes a flat state with coarse `isLoading` and `error` flags (matching the existing `useUserStore` pattern). Pagination (`page`, `pageSize`) lives at the top level, separate from content filters. Filters live in the store, not in the URL.

### Request sequence number guard

A monotonically increasing counter (`fetchSeq`) prevents stale API responses from overwriting newer ones when the user rapidly changes filters. A response is only applied if its captured sequence number matches the current counter.

### Optimistic updates

- **Delete:** The transaction is immediately filtered out of `transactions[]` and `totalCount` is decremented before the API call.
- **Update:** The transaction is immediately replaced in-place using the sent data before the API call.
- **Add:** Not truly optimistic — the store waits for the API response, then inserts the returned transaction at the front of the list.
- After every mutation (success or failure), the store re-fetches the current page to reconcile with the server.
- No rollback on failure — the re-fetch corrects any optimistic state.

### Auto-fetch on filter/page changes

`setFilters()` and `setPage()` both trigger an automatic `fetchTransactions()`. `setFilters()` additionally resets `page` to 1. Neither action returns a promise (fire-and-forget) — consumers watch `isLoading` to know when the fetch completes.

### Error handling

Error is cleared at the start of every action. On failure, the error message from `ApiError` is stored. No abort or cancellation is implemented beyond the sequence number guard.

### Existing modules — no changes needed

- `services/api.ts` — all five API functions exist and are used by the store.
- `types/api.types.ts` — all request/response types exist.
- `types/models.ts` — `Transaction` model exists.
- `mocks/handlers.ts` — all CRUD handlers exist.

### Export

The store is exported as a named constant `useTransactionStore`, matching the `useUserStore` pattern.

## Testing Decisions

**Out of scope for this PRD.** The store will be well-factored for testing (the interface is simple, the internals are self-contained), but tests are deferred.

## Out of Scope

- Unit or integration tests for the store.
- URL-based filter state (filters live in the store only).
- `selectedTransaction` or detail-view state.
- Per-operation loading flags (single `isLoading`).
- AbortController-based request cancellation.
- `reset()` action for logout.
- Changes to existing modules (`api.ts`, `mocks/handlers.ts`, types).

## Further Notes

This store is the first feature-specific Zustand store in the app (the only other store is `userStore` for auth). It establishes the pattern for future feature stores: coarse loading/error, auto-fetch on state changes, optimistic updates with re-fetch reconciliation, and sequence-number race guards.
