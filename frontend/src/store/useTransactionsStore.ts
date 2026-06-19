import { create } from "zustand"
import type { TransactionDto } from "@/types"
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
}))