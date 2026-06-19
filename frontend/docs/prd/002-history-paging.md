# PRD: History Page — Load-More Paging

## Problem Statement

The History page currently fetches all transactions in a single request (limited only by the default `pageSize: 50`). There is no way for the user to browse beyond the first page of results. As the transaction count grows, the UI remains stuck on the first 50 rows with no indication that more data exists and no way to access it.

## Solution

Replace the single-shot fetch with an incremental "load more" pattern. The page displays the first 50 transactions. When the user scrolls to the bottom of the list, a "Show more…" button appears. Clicking it fetches the next 50 transactions and appends them to the existing list. A running count shows progress ("All 142 transactions loaded") once the entire dataset has been retrieved.

## User Stories

1. As a user viewing my transaction history, I want to see the first 50 transactions immediately, so that the page loads quickly without fetching unnecessary data.

2. As a user scrolling through my history, I want a "Show more…" button at the bottom of the list, so that I can explicitly request additional transactions when I'm ready to see them.

3. As a user who has clicked "Show more…", I want to see a loading spinner on the button, so that I know the app is fetching the next batch.

4. As a user who has exhausted all transactions, I want to see a message like "All 142 transactions loaded", so that I know there is nothing more to fetch.

5. As a user who experiences a network failure during a "load more" request, I want to see an inline retry prompt on the button, so that I can recover without losing the transactions already shown.

6. As a user who switches between books, I want the transaction list to reset to page 1, so that I'm not seeing stale transactions from the previous book.

7. As a user who applies a filter (date range, category), I want the transaction list to reset to page 1 matching the filter, so that the load-more state doesn't carry over from an unrelated query.

8. As a user who creates a new transaction, I want it to appear prepended to the list and the total counter to update, so that I can immediately see the new entry (existing behavior preserved).

9. As a user who deletes a transaction, I want it removed from the list and the total counter to update, so that the displayed data stays accurate (existing behavior preserved).

## Implementation Decisions

### 1. Paging model: Offset-based "Load More" (append)

The existing `GET /api/v1/transactions` endpoint already supports `page` and `pageSize` query parameters and returns `meta.page`, `meta.pageSize`, `meta.total`. The frontend will increment `page` on each "Show more" click and append the returned items to the displayed list.

### 2. Default page size: 50

Matches the existing store default (`pageSize: 50`) and the existing mock handler default. No API contract change needed.

### 3. State lives in the store (`useTransactionsStore`)

All load-more logic is added to the existing Zustand store to keep it centralized and testable.

**New state fields:**
- `hasMore: boolean` — computed as `transactions.length < total` after a fetch
- `isLoadingMore: boolean` — `true` only during a `loadMore()` call (distinct from the full-page `isLoading`)
- `epoch: number` — generation counter incremented on each `fetchTransactions()` to guard against stale async responses

**Modified action: `fetchTransactions(params?)`**
- Resets `page` to 1
- Replaces `transactions` with the new page
- Increments `epoch`
- Sets `hasMore` based on `transactions.length < total`
- Sets `isLoadingMore: false`

**New action: `loadMore()`**
- Checks `!hasMore || isLoadingMore` → early return
- Increments `page`
- Calls `getTransactions({...lastParams, page})`
- On success: appends `items` to `transactions`, updates `hasMore`
- On failure: sets a local retryable error (not the global `error` state) so existing transactions remain visible
- Guards against stale responses by storing `epoch` at call time and discarding the response if the store's `epoch` has changed

### 4. Stale response guard (epoch counter)

A simple monotonically increasing integer prevents race conditions when the user switches books or changes filters while a `loadMore()` is in-flight:

```
epoch = 0
fetchTransactions():
  epoch += 1
  const captureEpoch = epoch
  response = await apiCall()
  if (store.epoch !== captureEpoch) return  // stale
  apply response

loadMore():
  const captureEpoch = epoch
  response = await apiCall()
  if (store.epoch !== captureEpoch) return  // stale
  append response
```

### 5. "Show more" button UI

Rendered inside the existing `<ScrollArea>` at the end of the transaction list. Three states:

| State | Appearance |
|---|---|
| Has more, idle | `[  Show more…  ]` — centered, clickable button |
| Has more, loading | `[  ⟳  Loading…  ]` — spinner + text, button disabled |
| End of list | `"All 142 transactions loaded"` — subtle text, no button |

### 6. Error handling for `loadMore()`

On failure, the button transitions to:
`[  Failed to load. Retry?  ]`

This is an inline, retryable state set only on the button, not the global `error` field (which shows a banner at the top for initial-load failures). Clicking "Retry?" re-invokes `loadMore()`.

### 7. No changes needed to existing layers

- **`transactionsService`** — already supports pagination via `GetTransactionsParams.page`/`.pageSize`. Unchanged.
- **`API.md`** — already documents `page` and `pageSize` query params. Unchanged.
- **MSW handler (`handlers.ts`)** — already paginates correctly. Unchanged.
- **`TransactionRow`** — no changes needed.

### 8. Creating / deleting transactions

Existing optimistic updates in the store (`createTransaction` prepends, `deleteTransaction` removes) continue to work. The `hasMore` calculation (`transactions.length < total`) will automatically adjust — if more items are deleted than were left in the buffer, `hasMore` may become `false` early, which is acceptable behavior.

## Testing Decisions

### Test philosophy
- Test behavior, not implementation details.
- Use user-visible selectors (test IDs, aria-labels) to interact with the component.
- Mock network requests via MSW (already wired in the test suite).
- Store tests exercise the action logic directly, not via React components.

### Modules to test

1. **`useTransactionsStore`** (new test file: `useTransactionsStore.test.ts`)
   - `loadMore` appends items when `hasMore` is true
   - `loadMore` is a no-op when `!hasMore`
   - `loadMore` is a no-op when `isLoadingMore` is true
   - `loadMore` sets `hasMore = false` when `total` is reached
   - `fetchTransactions` resets the list and `page` to 1
   - `fetchTransactions` increments `epoch` and guards against stale `loadMore` responses
   - Creating a transaction increments `total` and prepends
   - Deleting a transaction decrements `total` and removes

2. **`HistoryPage`** (new component test or extended existing)
   - Shows skeleton loader on initial load
   - Shows "Show more…" button when `hasMore` is true
   - Clicking "Show more…" disables the button and shows loading state
   - Shows "All N transactions loaded" when `!hasMore`
   - Shows "Failed to load. Retry?" when `loadMore` fails
   - Clicks on "Show more…" trigger `loadMore` and append new items to the DOM

### Prior art in the codebase
- `src/services/transactionsService.test.ts` — tests service layer with MSW and `beforeAll` login.
- `src/pages/add/AddPage.test.tsx` — component test using MSW, React Testing Library, user events.
- Follow patterns from `AddPage.test.tsx` for component tests (render, MSW handlers already active, `screen.findBy*` for async assertions).

## Out of Scope

- Infinite scroll / intersection observer auto-loading (explicit button only).
- Skeleton rows during `loadMore` (spinner on button only).
- Jump-to-page or page-number navigation.
- Sorting controls or column headers on the transaction list.
- Filter/search integration beyond the existing `bookId` filter (the epoch guard is sufficient for any future filter integration).
- Cursor-based pagination (offset-based is sufficient and matches the existing API contract).

## Further Notes

- The existing `ScrollArea` component (from shadcn) is sufficient; no custom scroll handling is required because appending items pushes content below the viewport and the scrollbar shrinks naturally.
- The `total` value in the store may become slightly stale after create/delete operations because the total is only refreshed on `fetchTransactions`. This is acceptable — the total displayed in the header and in the "All N transactions loaded" message is an approximation, not a live server count.
- No npm packages need to be added.