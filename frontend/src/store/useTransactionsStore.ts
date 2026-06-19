import { create } from "zustand"
import type { FilterRequest, TransactionDto } from "@/types"
import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/services"
import type {
  GetTransactionsParams,
  CreateTransactionRequest,
  UpdateTransactionRequest,
} from "@/services"
import { useUsersStore } from "./useUsersStore"
import { useCategoriesStore } from "./useCategoriesStore"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a `FilterRequest` (which may include a named period like "thisMonth")
 * into concrete `from` / `to` ISO date strings.
 */
function resolvePeriod(filter: FilterRequest): { from?: string; to?: string } {
  if (filter.period === "custom") {
    return { from: filter.startDate, to: filter.endDate }
  }

  if (!filter.period || filter.period === "all") {
    return {}
  }

  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const start = startOfDay(now)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)

  switch (filter.period) {
    case "today":
      return { from: start.toISOString(), to: end.toISOString() }
    case "thisWeek": {
      const dayOfWeek = start.getDay()
      const monday = new Date(start)
      monday.setDate(start.getDate() - ((dayOfWeek + 6) % 7))
      return { from: monday.toISOString(), to: end.toISOString() }
    }
    case "thisMonth": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: monthStart.toISOString(), to: end.toISOString() }
    }
    case "thisYear": {
      const yearStart = new Date(now.getFullYear(), 0, 1)
      return { from: yearStart.toISOString(), to: end.toISOString() }
    }
    default:
      return {}
  }
}

/**
 * Convert a `FilterRequest` (UI model) to `GetTransactionsParams` (API params).
 * Resolves named periods to dates, maps category IDs to names,
 * and maps user emails to IDs.
 */
function convertFilterToGetTransactionsParams(filter: FilterRequest): GetTransactionsParams {
  const { from, to } = resolvePeriod(filter)

  // Map category IDs → names
  const categories = useCategoriesStore.getState().categories
  const idToName = new Map(categories.map((c) => [c.id, c.name]))
  const categoryNames = filter.category
    ?.map((id) => idToName.get(id))
    .filter((n): n is string => !!n)

  // Map user emails → IDs
  const users = useUsersStore.getState().users
  const emailToId = new Map(users.map((u) => [u.email, u.id]))
  const userIds = filter.user
    ?.map((email) => emailToId.get(email) || email)
    .filter((id): id is string => !!id)

  return {
    from,
    to,
    category: categoryNames?.length ? categoryNames : undefined,
    createdBy: userIds?.length ? userIds : undefined,
    note: filter.note || undefined,
    minValue: filter.minValue,
    maxValue: filter.maxValue,
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface TransactionsState {
  /** Paginated list of transactions for the current query. */
  transactions: TransactionDto[]
  /** A single transaction for the detail view. */
  currentTransaction: TransactionDto | null
  /** Whether a fetch is in progress. */
  isLoading: boolean
  /** Human-readable error message, or null. */
  error: string | null
  /** Pagination info from the last list fetch. */
  page: number
  pageSize: number
  total: number
  /** The params used for the last successful list fetch. */
  lastParams: GetTransactionsParams
  /** Whether there are more pages to load. */
  hasMore: boolean
  /** Whether a "load more" request is in progress. */
  isLoadingMore: boolean
  /** Generation counter to guard against stale async responses. */
  epoch: number
  /** Human-readable error from a loadMore request (does not clear the list). */
  loadMoreError: string | null
  /** The currently active filter, or default empty filter. */
  currentFilter: FilterRequest
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface TransactionsActions {
  /** Fetch a paginated list of transactions. Replaces the current list. */
  fetchTransactions: (params?: GetTransactionsParams) => Promise<TransactionDto[]>
  /** Fetch a single transaction by ID. */
  fetchTransaction: (transactionId: string) => Promise<TransactionDto>
  /** Create a new transaction and optimistically add it to the current list. */
  createTransaction: (req: CreateTransactionRequest) => Promise<TransactionDto>
  /** Update a transaction and optimistically update state. */
  updateTransaction: (transactionId: string, req: UpdateTransactionRequest) => Promise<TransactionDto>
  /** Delete a transaction and optimistically remove it from the current list. */
  deleteTransaction: (transactionId: string) => Promise<void>
  /** Clear the current transaction detail. */
  clearCurrentTransaction: () => void
  /** Clear any stored error. */
  clearError: () => void
  /** Load the next page and append transactions to the current list. */
  loadMore: () => Promise<void>
  /** Apply a filter, resolve it to API params, reset to page 1, and fetch. */
  setFilter: (filter: FilterRequest) => Promise<TransactionDto[]>
  /** Clear the active filter and refetch. Optionally override the bookId. */
  clearFilter: (bookIdOverride?: string) => Promise<TransactionDto[]>
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useTransactionsStore = create<TransactionsState & TransactionsActions>((set, get) => ({
  // -- State --
  transactions: [],
  currentTransaction: null,
  isLoading: false,
  error: null,
  page: 1,
  pageSize: 50,
  total: 0,
  hasMore: false,
  isLoadingMore: false,
  epoch: 0,
  loadMoreError: null,
  lastParams: {},
  currentFilter: {},

  // -- Actions --

  fetchTransactions: async (params?: GetTransactionsParams) => {
    set({ isLoading: true, error: null, isLoadingMore: false, loadMoreError: null })
    try {
      const result = await getTransactions(params)
      const epoch = get().epoch + 1
      set({
        transactions: result.items,
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        hasMore: result.items.length < result.total,
        lastParams: params ?? {},
        isLoading: false,
        isLoadingMore: false,
        loadMoreError: null,
        epoch,
      })
      return result.items
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load transactions"
      set({ error: message, isLoading: false, isLoadingMore: false })
      throw err
    }
  },

  fetchTransaction: async (transactionId: string) => {
    set({ isLoading: true, error: null })
    try {
      const data = await getTransaction(transactionId)
      set({ currentTransaction: data, isLoading: false })
      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load transaction"
      set({ error: message, isLoading: false })
      throw err
    }
  },

  createTransaction: async (req: CreateTransactionRequest) => {
    set({ error: null })
    try {
      const created = await createTransaction(req)
      // Prepend the new transaction to the current list
      set((state) => ({
        transactions: [created, ...state.transactions],
        total: state.total + 1,
      }))
      return created
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create transaction"
      set({ error: message })
      throw err
    }
  },

  updateTransaction: async (transactionId: string, req: UpdateTransactionRequest) => {
    set({ error: null })
    // Optimistic update
    const previous = get().transactions
    const previousCurrent = get().currentTransaction
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === transactionId ? { ...t, ...req } : t,
      ),
      currentTransaction:
        state.currentTransaction?.id === transactionId
          ? { ...state.currentTransaction, ...req }
          : state.currentTransaction,
    }))
    try {
      const updated = await updateTransaction(transactionId, req)
      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === transactionId ? updated : t)),
        currentTransaction:
          state.currentTransaction?.id === transactionId ? updated : state.currentTransaction,
      }))
      return updated
    } catch (err: unknown) {
      // Revert on failure
      set({
        transactions: previous,
        currentTransaction: previousCurrent,
        error: err instanceof Error ? err.message : "Failed to update transaction",
      })
      throw err
    }
  },

  deleteTransaction: async (transactionId: string) => {
    set({ error: null })
    const previous = get().transactions
    const previousCurrent = get().currentTransaction
    // Optimistic removal
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== transactionId),
      total: state.total - 1,
      currentTransaction:
        state.currentTransaction?.id === transactionId ? null : state.currentTransaction,
    }))
    try {
      await deleteTransaction(transactionId)
    } catch (err: unknown) {
      set({
        transactions: previous,
        currentTransaction: previousCurrent,
        error: err instanceof Error ? err.message : "Failed to delete transaction",
      })
      throw err
    }
  },

  loadMore: async () => {
    const state = get()
    if (!state.hasMore || state.isLoadingMore) return

    set({ isLoadingMore: true, loadMoreError: null })

    const captureEpoch = state.epoch
    const nextPage = state.page + 1

    try {
      const result = await getTransactions({ ...state.lastParams, page: nextPage })

      // Guard against stale response (book/filter changed while loading)
      if (get().epoch !== captureEpoch) return

      set({
        transactions: [...state.transactions, ...result.items],
        page: result.page,
        total: result.total,
        hasMore: state.transactions.length + result.items.length < result.total,
        isLoadingMore: false,
        loadMoreError: null,
      })
    } catch (err: unknown) {
      // Don't overwrite global error — keep existing transactions visible
      const message = err instanceof Error ? err.message : "Failed to load more transactions"
      set({ isLoadingMore: false, loadMoreError: message })
    }
  },

  clearCurrentTransaction: () => {
    set({ currentTransaction: null })
  },

  clearError: () => {
    set({ error: null })
  },

  // -- Filter actions --

  setFilter: (filter: FilterRequest) => {
    set({ currentFilter: filter })
    const apiParams = convertFilterToGetTransactionsParams(filter)
    apiParams.page = 1
    return get().fetchTransactions(apiParams)
  },

  clearFilter: (bookIdOverride?: string) => {
    set({ currentFilter: {} })
    const bookId = bookIdOverride || get().lastParams.bookId
    return get().fetchTransactions({ bookId })
  },
}))