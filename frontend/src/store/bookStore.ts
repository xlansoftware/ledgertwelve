import { create } from 'zustand'
import type { CreateBookRequest, UpdateBookRequest } from '@/types/api.types'
import type { Book } from '@/types/models'
import * as api from '@/services/api'
import { useTransactionStore } from './transactionStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BookState {
  books: Book[]
  currentBook: Book | null
  isLoading: boolean
  isLoaded: boolean
  error: string | null

  fetchBooks: () => Promise<void>
  ensureLoaded: () => Promise<void>
  createBook: (data: CreateBookRequest) => Promise<void>
  updateBook: (id: string, data: UpdateBookRequest) => Promise<void>
  deleteBook: (id: string) => Promise<void>
  openBook: (name: string | null) => Promise<void>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let fetchSeq = 0

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useBookStore = create<BookState>((set, get) => ({
  books: [],
  currentBook: null,
  isLoading: false,
  isLoaded: false,
  error: null,

  // -----------------------------------------------------------------------
  // fetchBooks
  // -----------------------------------------------------------------------

  fetchBooks: async () => {
    const seq = ++fetchSeq
    set({ isLoading: true, error: null })

    try {
      const data = await api.getBooks()

      // Guard against stale responses from rapid calls
      if (seq !== fetchSeq) return

      // Update the current book
      const currentBook = get().currentBook;
      const book = data.find((b) => 
        b.name?.toLowerCase() === (currentBook?.name ?? "Ledger").toLowerCase(),
      )

      set({ books: data, isLoading: false, isLoaded: true, currentBook: book || currentBook })
    } catch (err: unknown) {
      if (seq !== fetchSeq) return

      const message =
        err instanceof api.ApiError
          ? err.message
          : 'Failed to load books.'
      set({ error: message, isLoading: false })
    }
  },

  // -----------------------------------------------------------------------
  // ensureLoaded — load books once, skip if already loaded
  // -----------------------------------------------------------------------

  ensureLoaded: async () => {
    const state = get()
    if (state.isLoaded || state.isLoading) return
    await state.fetchBooks()
  },

  // -----------------------------------------------------------------------
  // createBook — append optimistically, then re-fetch
  // -----------------------------------------------------------------------

  createBook: async (data: CreateBookRequest) => {
    set({ error: null })

    try {
      await api.createBook(data)
    } catch (err: unknown) {
      const message =
        err instanceof api.ApiError
          ? err.message
          : 'Failed to create book.'
      set({ error: message })
      return
    }

    await get().fetchBooks()
  },

  // -----------------------------------------------------------------------
  // updateBook — optimistic update, then re-fetch
  // -----------------------------------------------------------------------

  updateBook: async (id: string, data: UpdateBookRequest) => {
    set({ error: null })

    // Optimistic update
    set((state) => ({
      books: state.books.map((b) =>
        b.id === id ? { ...b, ...data } : b,
      ),
    }))

    try {
      await api.updateBook(id, data)
    } catch (err: unknown) {
      const message =
        err instanceof api.ApiError
          ? err.message
          : 'Failed to update book.'
      set({ error: message })
    }

    // Re-fetch to reconcile with server
    await get().fetchBooks()
  },

  // -----------------------------------------------------------------------
  // deleteBook — optimistic removal, then re-fetch
  // -----------------------------------------------------------------------

  deleteBook: async (id: string) => {
    set({ error: null })

    // Optimistic removal
    set((state) => ({
      books: state.books.filter((b) => b.id !== id),
    }))

    try {
      await api.deleteBook(id)
    } catch (err: unknown) {
      const message =
        err instanceof api.ApiError
          ? err.message
          : 'Failed to delete book.'
      set({ error: message })
    }

    // Re-fetch to reconcile with server
    await get().fetchBooks()
  },

  // -----------------------------------------------------------------------
  // openBook — select a book as the current context
  // -----------------------------------------------------------------------

  openBook: async (name: string | null) => {
    const book = get().books.find((b) =>
      b.name?.toLowerCase() === name?.toLowerCase(),
    )
    set({ currentBook: book ?? null })

    // Push the book filter into the transaction store
    useTransactionStore.getState().setFilters({ book: book?.name })
  },
}))