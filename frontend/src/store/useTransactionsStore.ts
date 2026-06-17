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
  lastParams: {},

  // -- Actions --

  fetchTransactions: async (params?: GetTransactionsParams) => {
    set({ isLoading: true, error: null })
    try {
      const result = await getTransactions(params)
      set({
        transactions: result.items,
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        lastParams: params ?? {},
        isLoading: false,
      })
      return result.items
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load transactions"
      set({ error: message, isLoading: false })
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

  clearCurrentTransaction: () => {
    set({ currentTransaction: null })
  },

  clearError: () => {
    set({ error: null })
  },
}))