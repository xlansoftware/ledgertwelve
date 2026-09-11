// ---------------------------------------------------------------------------
// refreshBookStores — keep every store in sync with the selected book
// ---------------------------------------------------------------------------

import { useCategoriesStore } from "./useCategoriesStore"
import { useTransactionsStore } from "./useTransactionsStore"
import { useUsersStore } from "./useUsersStore"

/**
 * Refresh the data of every store whose contents are scoped to (or affected
 * by) the currently selected book.
 *
 * - `transactions` — book-scoped; the previous book's list is discarded and
 *   the new book's first page is loaded.
 * - `categories` / `users` — global reference data, refetched so the app never
 *   renders a mix of old and new book context.
 *
 * The books store itself is not touched here: `setCurrentBook` has already
 * updated `currentBook`. Failures are isolated with `Promise.allSettled` —
 * each store records its own error and a failed refresh never reverts the book
 * selection.
 */
export async function refreshBookStores(bookId: string): Promise<void> {
  await Promise.allSettled([
    useTransactionsStore.getState().resetForBook(bookId),
    useCategoriesStore.getState().fetchCategories(),
    useUsersStore.getState().fetchUsers(),
  ])
}
