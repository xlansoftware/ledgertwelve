// ---------------------------------------------------------------------------
// Application initializer — fetches all reference data before the first render
// ---------------------------------------------------------------------------

import { useBooksStore, useCategoriesStore, useUsersStore } from "@/store"

/**
 * Fetch all reference data needed by the app before the initial render.
 *
 * - books (and implicitly sets currentBook to the first one)
 * - categories (for transaction entry, filters, etc.)
 * - users (for shared-book filters)
 *
 * Throws if **any** fetch fails — the caller (main.tsx) should show a
 * full-screen error and not render the app.
 */
export async function initializeApp(): Promise<void> {
  await Promise.all([
    useBooksStore.getState().fetchBooks(),
    useCategoriesStore.getState().fetchCategories(),
    useUsersStore.getState().fetchUsers(),
  ])
}