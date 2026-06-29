// ---------------------------------------------------------------------------
// useRefresh — centralized data refresh infrastructure
//
// Exports:
//   refresh(targets)    — imperative function to re-fetch specified stores
//   useRefresh(targets) — React hook that calls refresh() once on mount
// ---------------------------------------------------------------------------

import { useEffect } from "react"
import { useBooksStore, useCategoriesStore, useUsersStore, useTransactionsStore } from "@/store"
import type { GetTransactionsParams } from "@/features/offline/interfaces/ITransactionsService"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RefreshTargets = {
  books?: boolean
  transactions?: boolean
  categories?: boolean
  users?: boolean
}

// ---------------------------------------------------------------------------
// refresh — imperative function
// ---------------------------------------------------------------------------

/**
 * Re-fetch data for the specified entity types by calling each store's
 * respective `fetch*` method. Errors are silently swallowed — each store
 * independently catches errors and stores them in its own `error` state.
 *
 * Entities are refreshed sequentially in declaration order to avoid
 * overloading the network.
 */
export async function refresh(targets: RefreshTargets): Promise<void> {
  const order: (keyof RefreshTargets)[] = ["books", "transactions", "categories", "users"]

  for (const key of order) {
    if (!targets[key]) continue

    try {
      switch (key) {
        case "books":
          await useBooksStore.getState().fetchBooks()
          break
        case "transactions": {
          const lastParams: GetTransactionsParams = useTransactionsStore.getState().lastParams
          await useTransactionsStore.getState().fetchTransactions(lastParams)
          break
        }
        case "categories":
          await useCategoriesStore.getState().fetchCategories()
          break
        case "users":
          await useUsersStore.getState().fetchUsers()
          break
      }
    } catch {
      // Errors are swallowed — each store stores its own error state.
    }
  }
}

// ---------------------------------------------------------------------------
// useRefresh — React hook
// ---------------------------------------------------------------------------

/**
 * Calls `refresh(targets)` once when the component mounts.
 * The targets are fixed for the lifetime of the component.
 * This is a pure side-effect hook — it returns nothing.
 */
export function useRefresh(targets: RefreshTargets): void {
  useEffect(() => {
    refresh(targets)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
