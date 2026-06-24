import { create } from "zustand"
import type { BookDto, CloseBookResponse, ReopenBookResponse, ShareResponse } from "@/types"
import { getFactory } from "@/features/offline"
import type {
  CreateBookRequest,
  UpdateBookRequest,
  CloseBookRequest,
  AddShareRequest,
  UpdateShareRequest,
} from "@/features/offline/interfaces/IBooksService"

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive the "main" book ID from the books list:
 * - If there's a book named "Main", use its id.
 * - Otherwise, if there's only one book, use its id.
 * - Otherwise return null.
 */
function deriveMainBookId(books: BookDto[]): string | null {
  const main = books.find((b) => b.name === "Main")
  if (main) return main.id
  if (books.length === 1) return books[0].id
  return null
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface BooksState {
  /** The list of books visible to the current user. */
  books: BookDto[]
  /** A single book for the detail view. */
  currentBook: BookDto | null
  /** The ID of the primary book (named "Main", or the only book). */
  mainBookId: string | null
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
  mainBookId: null,
  isLoading: false,
  error: null,

  // -- Actions --

  fetchBooks: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await getFactory().books.getBooks()
      const mainBookId = deriveMainBookId(data)
      set({ books: data, mainBookId, isLoading: false })
      // Also fetch the persisted current book selection
      try {
        const current = await getFactory().books.getCurrentBook()
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
      const current = await getFactory().books.getCurrentBook()
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
      const updated = await getFactory().books.setCurrentBook(bookId)
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
      const data = await getFactory().books.getBook(bookId)
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
      const created = await getFactory().books.createBook(req)
      set((state) => {
        const books = [...state.books, created]
        return { books, mainBookId: deriveMainBookId(books) }
      })
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
      const updated = await getFactory().books.updateBook(bookId, req)
      set((state) => {
        const books = state.books.map((b) => (b.id === bookId ? updated : b))
        return {
          books,
          mainBookId: deriveMainBookId(books),
          currentBook:
            state.currentBook?.id === bookId ? updated : state.currentBook,
        }
      })
      return updated
    } catch (err: unknown) {
      // Revert on failure
      set({
        books: previous,
        mainBookId: deriveMainBookId(previous),
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
      mainBookId: deriveMainBookId(state.books.filter((b) => b.id !== bookId)),
      currentBook:
        state.currentBook?.id === bookId ? null : state.currentBook,
    }))
    try {
      await getFactory().books.deleteBook(bookId)
    } catch (err: unknown) {
      set({
        books: previous,
        mainBookId: deriveMainBookId(previous),
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
      const result = await getFactory().books.closeBook(bookId, req)
      // Refresh the book detail to get accurate data from the server
      const updated = await getFactory().books.getBook(bookId)
      set((state) => {
        const books = state.books.map((b) => (b.id === bookId ? updated : b))
        return { books, mainBookId: deriveMainBookId(books), currentBook: state.currentBook?.id === bookId ? updated : state.currentBook }
      })
      return result
    } catch (err: unknown) {
      // Revert on failure
      set({
        books: previous,
        mainBookId: deriveMainBookId(previous),
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
      const result = await getFactory().books.reopenBook(bookId)
      // Refresh the book detail to get accurate data from the server
      const updated = await getFactory().books.getBook(bookId)
      set((state) => {
        const books = state.books.map((b) => (b.id === bookId ? updated : b))
        return { books, mainBookId: deriveMainBookId(books), currentBook: state.currentBook?.id === bookId ? updated : state.currentBook }
      })
      return result
    } catch (err: unknown) {
      // Revert on failure
      set({
        books: previous,
        mainBookId: deriveMainBookId(previous),
        currentBook: previousCurrent,
        error: err instanceof Error ? err.message : "Failed to reopen book",
      })
      throw err
    }
  },

  addShare: async (bookId: string, req: AddShareRequest) => {
    set({ error: null })
    try {
      const result = await getFactory().books.addShare(bookId, req)
      // Refresh the book detail to reflect the new share
      if (get().currentBook?.id === bookId || get().books.some((b) => b.id === bookId)) {
        const updated = await getFactory().books.getBook(bookId)
        set((state) => {
          const books = state.books.map((b) => (b.id === bookId ? updated : b))
          return { books, mainBookId: deriveMainBookId(books), currentBook: state.currentBook?.id === bookId ? updated : state.currentBook }
        })
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
      const result = await getFactory().books.updateShare(bookId, userId, req)
      // Refresh the book detail to reflect the updated permission
      if (get().currentBook?.id === bookId || get().books.some((b) => b.id === bookId)) {
        const updated = await getFactory().books.getBook(bookId)
        set((state) => {
          const books = state.books.map((b) => (b.id === bookId ? updated : b))
          return { books, mainBookId: deriveMainBookId(books), currentBook: state.currentBook?.id === bookId ? updated : state.currentBook }
        })
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
      await getFactory().books.removeShare(bookId, userId)
      // Refresh the book detail to reflect the removed share
      if (get().currentBook?.id === bookId || get().books.some((b) => b.id === bookId)) {
        const updated = await getFactory().books.getBook(bookId)
        set((state) => {
          const books = state.books.map((b) => (b.id === bookId ? updated : b))
          return { books, mainBookId: deriveMainBookId(books), currentBook: state.currentBook?.id === bookId ? updated : state.currentBook }
        })
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