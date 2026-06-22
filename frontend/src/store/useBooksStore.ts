import { create } from "zustand"
import type { BookDto, CloseBookResponse, ReopenBookResponse, ShareResponse } from "@/types"
import {
  getBooks,
  getBook,
  getCurrentBook,
  setCurrentBook as setCurrentBookService,
  createBook,
  updateBook,
  deleteBook,
  closeBook,
  reopenBook,
  addShare,
  updateShare,
  removeShare,
} from "@/services"
import type {
  CreateBookRequest,
  UpdateBookRequest,
  CloseBookRequest,
  AddShareRequest,
  UpdateShareRequest,
} from "@/services"

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface BooksState {
  /** The list of books visible to the current user. */
  books: BookDto[]
  /** A single book for the detail view. */
  currentBook: BookDto | null
  /** Whether a fetch is in progress. */
  isLoading: boolean
  /** Human-readable error message, or null. */
  error: string | null
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface BooksActions {
  /** Fetch all books visible to the user. */
  fetchBooks: () => Promise<BookDto[]>
  /** Fetch the persisted current book selection from the server. */
  fetchCurrentBook: () => Promise<void>
  /** Persist a book selection as the current book. */
  setCurrentBook: (bookId: string) => Promise<BookDto>
  /** Fetch a single book by ID. */
  fetchBook: (bookId: string) => Promise<BookDto>
  /** Create a new book and optimistically add it to state. */
  createBook: (req: CreateBookRequest) => Promise<BookDto>
  /** Update a book and optimistically update state. */
  updateBook: (bookId: string, req: UpdateBookRequest) => Promise<BookDto>
  /** Delete a book and optimistically remove it from state. */
  deleteBook: (bookId: string) => Promise<void>
  /** Close a book and optimistically update its status. */
  closeBook: (bookId: string, req: CloseBookRequest) => Promise<CloseBookResponse>
  /** Reopen a closed book and optimistically update its status. */
  reopenBook: (bookId: string) => Promise<ReopenBookResponse>
  /** Add a shared user to a book. */
  addShare: (bookId: string, req: AddShareRequest) => Promise<ShareResponse>
  /** Update a shared user's permission. */
  updateShare: (bookId: string, userId: string, req: UpdateShareRequest) => Promise<ShareResponse>
  /** Remove a shared user from a book. */
  removeShare: (bookId: string, userId: string) => Promise<void>
  /** Clear the current book detail. */
  clearCurrentBook: () => void
  /** Clear any stored error. */
  clearError: () => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

// Counter to ignore stale fetchBook responses
let fetchBookCounter = 0

export const useBooksStore = create<BooksState & BooksActions>((set, get) => ({
  // -- State --
  books: [],
  currentBook: null,
  isLoading: false,
  error: null,

  // -- Actions --

  fetchBooks: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await getBooks()
      set({ books: data, isLoading: false })
      // Also fetch the persisted current book selection
      try {
        const current = await getCurrentBook()
        set({ currentBook: current })
      } catch {
        // If fetching the current book fails, fall back to first in list
        set({ currentBook: get().currentBook || data[0] })
      }
      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load books"
      set({ error: message, isLoading: false })
      throw err
    }
  },

  fetchCurrentBook: async () => {
    try {
      const current = await getCurrentBook()
      set({ currentBook: current })
    } catch {
      // Keep existing currentBook on failure, or fall back to first book in list
      const state = get()
      if (!state.currentBook && state.books.length > 0) {
        set({ currentBook: state.books[0] })
      }
    }
  },

  setCurrentBook: async (bookId: string) => {
    set({ error: null })
    const previous = get().currentBook
    try {
      const updated = await setCurrentBookService(bookId)
      set({ currentBook: updated })
      return updated
    } catch (err: unknown) {
      // Revert on failure
      set({
        currentBook: previous,
        error: err instanceof Error ? err.message : "Failed to set current book",
      })
      throw err
    }
  },

  fetchBook: async (bookId: string) => {
    const callId = ++fetchBookCounter
    set({ isLoading: true, error: null })
    try {
      const data = await getBook(bookId)
      if (callId !== fetchBookCounter) return data
      set({ currentBook: data, isLoading: false })
      return data
    } catch (err: unknown) {
      if (callId !== fetchBookCounter) throw err
      const message = err instanceof Error ? err.message : "Failed to load book"
      set({ error: message, isLoading: false })
      throw err
    }
  },

  createBook: async (req: CreateBookRequest) => {
    set({ error: null })
    try {
      const created = await createBook(req)
      set((state) => ({ books: [...state.books, created] }))
      return created
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create book"
      set({ error: message })
      throw err
    }
  },

  updateBook: async (bookId: string, req: UpdateBookRequest) => {
    set({ error: null })
    // Optimistic update
    const previous = get().books
    const previousCurrent = get().currentBook
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId ? { ...b, ...req } : b,
      ),
      currentBook:
        state.currentBook?.id === bookId
          ? { ...state.currentBook, ...req }
          : state.currentBook,
    }))
    try {
      const updated = await updateBook(bookId, req)
      set((state) => ({
        books: state.books.map((b) => (b.id === bookId ? updated : b)),
        currentBook:
          state.currentBook?.id === bookId ? updated : state.currentBook,
      }))
      return updated
    } catch (err: unknown) {
      // Revert on failure
      set({
        books: previous,
        currentBook: previousCurrent,
        error: err instanceof Error ? err.message : "Failed to update book",
      })
      throw err
    }
  },

  deleteBook: async (bookId: string) => {
    set({ error: null })
    const previous = get().books
    const previousCurrent = get().currentBook
    // Optimistic removal
    set((state) => ({
      books: state.books.filter((b) => b.id !== bookId),
      currentBook:
        state.currentBook?.id === bookId ? null : state.currentBook,
    }))
    try {
      await deleteBook(bookId)
    } catch (err: unknown) {
      set({
        books: previous,
        currentBook: previousCurrent,
        error: err instanceof Error ? err.message : "Failed to delete book",
      })
      throw err
    }
  },

  closeBook: async (bookId: string, req: CloseBookRequest) => {
    set({ error: null })
    // Optimistic status update
    const previous = get().books
    const previousCurrent = get().currentBook
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId ? { ...b, status: "closed" as const } : b,
      ),
      currentBook:
        state.currentBook?.id === bookId
          ? { ...state.currentBook, status: "closed" as const }
          : state.currentBook,
    }))
    try {
      const result = await closeBook(bookId, req)
      // Refresh the book detail to get accurate data from the server
      const updated = await getBook(bookId)
      set((state) => ({
        books: state.books.map((b) => (b.id === bookId ? updated : b)),
        currentBook:
          state.currentBook?.id === bookId ? updated : state.currentBook,
      }))
      return result
    } catch (err: unknown) {
      // Revert on failure
      set({
        books: previous,
        currentBook: previousCurrent,
        error: err instanceof Error ? err.message : "Failed to close book",
      })
      throw err
    }
  },

  reopenBook: async (bookId: string) => {
    set({ error: null })
    // Optimistic status update
    const previous = get().books
    const previousCurrent = get().currentBook
    set((state) => ({
      books: state.books.map((b) =>
        b.id === bookId ? { ...b, status: "open" as const } : b,
      ),
      currentBook:
        state.currentBook?.id === bookId
          ? { ...state.currentBook, status: "open" as const }
          : state.currentBook,
    }))
    try {
      const result = await reopenBook(bookId)
      // Refresh the book detail to get accurate data from the server
      const updated = await getBook(bookId)
      set((state) => ({
        books: state.books.map((b) => (b.id === bookId ? updated : b)),
        currentBook:
          state.currentBook?.id === bookId ? updated : state.currentBook,
      }))
      return result
    } catch (err: unknown) {
      // Revert on failure
      set({
        books: previous,
        currentBook: previousCurrent,
        error: err instanceof Error ? err.message : "Failed to reopen book",
      })
      throw err
    }
  },

  addShare: async (bookId: string, req: AddShareRequest) => {
    set({ error: null })
    try {
      const result = await addShare(bookId, req)
      // Refresh the book detail to reflect the new share
      if (get().currentBook?.id === bookId || get().books.some((b) => b.id === bookId)) {
        const updated = await getBook(bookId)
        set((state) => ({
          books: state.books.map((b) => (b.id === bookId ? updated : b)),
          currentBook:
            state.currentBook?.id === bookId ? updated : state.currentBook,
        }))
      }
      return result
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add share"
      set({ error: message })
      throw err
    }
  },

  updateShare: async (bookId: string, userId: string, req: UpdateShareRequest) => {
    set({ error: null })
    try {
      const result = await updateShare(bookId, userId, req)
      // Refresh the book detail to reflect the updated permission
      if (get().currentBook?.id === bookId || get().books.some((b) => b.id === bookId)) {
        const updated = await getBook(bookId)
        set((state) => ({
          books: state.books.map((b) => (b.id === bookId ? updated : b)),
          currentBook:
            state.currentBook?.id === bookId ? updated : state.currentBook,
        }))
      }
      return result
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update share"
      set({ error: message })
      throw err
    }
  },

  removeShare: async (bookId: string, userId: string) => {
    set({ error: null })
    try {
      await removeShare(bookId, userId)
      // Refresh the book detail to reflect the removed share
      if (get().currentBook?.id === bookId || get().books.some((b) => b.id === bookId)) {
        const updated = await getBook(bookId)
        set((state) => ({
          books: state.books.map((b) => (b.id === bookId ? updated : b)),
          currentBook:
            state.currentBook?.id === bookId ? updated : state.currentBook,
        }))
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove share"
      set({ error: message })
      throw err
    }
  },

  clearCurrentBook: () => {
    set({ currentBook: null })
  },

  clearError: () => {
    set({ error: null })
  },
}))