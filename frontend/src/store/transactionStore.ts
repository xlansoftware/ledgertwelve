import { create } from 'zustand'
import type {
  CreateTransactionRequest,
  TransactionFilters,
  UpdateTransactionRequest,
} from '@/types/api.types'
import type { Transaction } from '@/types/models'
import * as api from '@/services/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransactionState {
  transactions: Transaction[]
  totalCount: number
  page: number
  pageSize: number
  filters: TransactionFilters
  isLoading: boolean
  error: string | null

  fetchTransactions: (opts?: { append?: boolean }) => Promise<void>
  setFilters: (filters: Partial<TransactionFilters>) => void
  setPage: (page: number) => void
  addTransaction: (data: CreateTransactionRequest) => Promise<void>
  updateTransaction: (id: string, data: UpdateTransactionRequest) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let fetchSeq = 0

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 20

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  totalCount: 0,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  filters: {},
  isLoading: false,
  error: null,

  // -----------------------------------------------------------------------
  // fetchTransactions — optional append mode for pagination
  // -----------------------------------------------------------------------

  fetchTransactions: async (opts?: { append?: boolean }) => {
    const seq = ++fetchSeq
    const append = opts?.append ?? false

    // In append mode, increment page first; otherwise reset to page 1
    if (append) {
      set((state) => ({ page: state.page + 1 }))
    } else {
      set({ page: 1 })
    }

    set({ isLoading: true, error: null })

    try {
      const { page, pageSize, filters } = get()
      const response = await api.getTransactions({ page, pageSize, ...filters })

      // Guard against stale responses from rapid changes
      if (seq !== fetchSeq) return

      set({
        transactions: append
          ? [...get().transactions, ...response.items]
          : response.items,
        totalCount: response.totalCount,
        isLoading: false,
      })
    } catch (err: unknown) {
      if (seq !== fetchSeq) return

      const message =
        err instanceof api.ApiError
          ? err.message
          : 'Failed to load transactions.'
      set({ error: message, isLoading: false })
    }
  },

  // -----------------------------------------------------------------------
  // setFilters
  // -----------------------------------------------------------------------

  setFilters: (partial: Partial<TransactionFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...partial },
      page: 1,
      error: null,
    }))
    get().fetchTransactions()
  },

  // -----------------------------------------------------------------------
  // setPage
  // -----------------------------------------------------------------------

  setPage: (page: number) => {
    set({ page, error: null })
    get().fetchTransactions()
  },

  // -----------------------------------------------------------------------
  // addTransaction
  // -----------------------------------------------------------------------

  addTransaction: async (data: CreateTransactionRequest) => {
    set({ error: null })

    try {
      await api.createTransaction(data)
    } catch (err: unknown) {
      const message =
        err instanceof api.ApiError
          ? err.message
          : 'Failed to add transaction.'
      set({ error: message })
      return
    }

    // Re-fetch current page to reconcile with server
    await get().fetchTransactions()
  },

  // -----------------------------------------------------------------------
  // updateTransaction — optimistic update, then re-fetch
  // -----------------------------------------------------------------------

  updateTransaction: async (id: string, data: UpdateTransactionRequest) => {
    set({ error: null })

    // Optimistic update
    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...data } : t,
      ),
    }))

    try {
      await api.updateTransaction(id, data)
    } catch (err: unknown) {
      const message =
        err instanceof api.ApiError
          ? err.message
          : 'Failed to update transaction.'
      set({ error: message })
    }

    // Re-fetch current page to reconcile with server
    await get().fetchTransactions()
  },

  // -----------------------------------------------------------------------
  // deleteTransaction — optimistic removal, then re-fetch
  // -----------------------------------------------------------------------

  deleteTransaction: async (id: string) => {
    set({ error: null })

    // Optimistic removal
    set((state) => {
      const tx = state.transactions.find((t) => t.id === id)
      return {
        transactions: state.transactions.filter((t) => t.id !== id),
        totalCount: tx ? state.totalCount - 1 : state.totalCount,
      }
    })

    try {
      await api.deleteTransaction(id)
    } catch (err: unknown) {
      const message =
        err instanceof api.ApiError
          ? err.message
          : 'Failed to delete transaction.'
      set({ error: message })
    }

    // Re-fetch current page to reconcile with server
    await get().fetchTransactions()
  },
}))