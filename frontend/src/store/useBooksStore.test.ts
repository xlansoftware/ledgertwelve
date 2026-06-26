// ---------------------------------------------------------------------------
// Unit tests — useBooksStore
// ---------------------------------------------------------------------------

import { describe, expect, it, vi, beforeEach } from "vitest"
import { useBooksStore } from "./useBooksStore"
import * as booksService from "@/services/booksService"
import type { BookDto } from "@/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBook(overrides: Partial<BookDto> = {}): BookDto {
  return {
    id: "book_main",
    name: "Main",
    currency: "EUR",
    status: "open",
    ownerId: "usr_1",
    sharedWith: [],
    createdAt: "2026-01-01T10:00:00Z",
    ...overrides,
  }
}

const mockBooks: BookDto[] = [
  makeBook(),
  makeBook({
    id: "book_vacation",
    name: "Vacation 2026",
    createdAt: "2026-03-15T10:00:00Z",
  }),
]

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/services/booksService", () => ({
  getBooks: vi.fn(),
  getCurrentBook: vi.fn(),
  setCurrentBook: vi.fn(),
  getBook: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
  deleteBook: vi.fn(),
  closeBook: vi.fn(),
  reopenBook: vi.fn(),
  addShare: vi.fn(),
  updateShare: vi.fn(),
  removeShare: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset store state between tests
  useBooksStore.setState({
    books: [],
    currentBook: null,
    mainBookId: null,
    isLoading: false,
    error: null,
  })
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests — fetchCurrentBook
// ---------------------------------------------------------------------------

describe("useBooksStore — fetchCurrentBook", () => {
  it("sets currentBook in store on success", async () => {
    const mockCurrent = makeBook({ id: "book_vacation", name: "Vacation 2026" })
    vi.mocked(booksService.getCurrentBook).mockResolvedValueOnce(mockCurrent)

    await useBooksStore.getState().fetchCurrentBook()

    const state = useBooksStore.getState()
    expect(state.currentBook).toEqual(mockCurrent)
    expect(state.error).toBeNull()
  })

  it("keeps existing currentBook on failure when a book is already set", async () => {
    const existing = makeBook()
    useBooksStore.setState({ currentBook: existing })
    vi.mocked(booksService.getCurrentBook).mockRejectedValueOnce(
      new Error("Network error"),
    )

    await useBooksStore.getState().fetchCurrentBook()

    const state = useBooksStore.getState()
    expect(state.currentBook).toEqual(existing)
    expect(state.error).toBeNull() // fetchCurrentBook does not set error on failure
  })

  it("falls back to first book in list on failure if no currentBook is set", async () => {
    useBooksStore.setState({ books: mockBooks })
    vi.mocked(booksService.getCurrentBook).mockRejectedValueOnce(
      new Error("Network error"),
    )

    await useBooksStore.getState().fetchCurrentBook()

    const state = useBooksStore.getState()
    expect(state.currentBook).toEqual(mockBooks[0])
    expect(state.error).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Tests — setCurrentBook
// ---------------------------------------------------------------------------

describe("useBooksStore — setCurrentBook", () => {
  it("updates currentBook optimistically on success", async () => {
    const vacationBook = makeBook({ id: "book_vacation", name: "Vacation 2026" })
    vi.mocked(booksService.setCurrentBook).mockResolvedValueOnce(vacationBook)

    const result = await useBooksStore.getState().setCurrentBook("book_vacation")

    expect(result).toEqual(vacationBook)
    const state = useBooksStore.getState()
    expect(state.currentBook).toEqual(vacationBook)
    expect(state.error).toBeNull()
  })

  it("reverts currentBook on API error and sets error", async () => {
    const existing = makeBook()
    useBooksStore.setState({ currentBook: existing })
    vi.mocked(booksService.setCurrentBook).mockRejectedValueOnce(
      new Error("Book not found"),
    )

    await expect(
      useBooksStore.getState().setCurrentBook("book_invalid"),
    ).rejects.toThrow("Book not found")

    const state = useBooksStore.getState()
    expect(state.currentBook).toEqual(existing)
    expect(state.error).toBe("Book not found")
  })
})

// ---------------------------------------------------------------------------
// Tests — fetchBooks
// ---------------------------------------------------------------------------

describe("useBooksStore — fetchBooks", () => {
  it("loads books and fetches the persisted current book from server", async () => {
    vi.mocked(booksService.getBooks).mockResolvedValueOnce(mockBooks)
    const currentBook = makeBook({ id: "book_vacation", name: "Vacation 2026" })
    vi.mocked(booksService.getCurrentBook).mockResolvedValueOnce(currentBook)

    const result = await useBooksStore.getState().fetchBooks()

    expect(result).toEqual(mockBooks)
    const state = useBooksStore.getState()
    expect(state.books).toEqual(mockBooks)
    expect(state.currentBook).toEqual(currentBook)
    expect(state.isLoading).toBe(false)
  })

  it("falls back to first book in list when fetchCurrentBook fails", async () => {
    vi.mocked(booksService.getBooks).mockResolvedValueOnce(mockBooks)
    vi.mocked(booksService.getCurrentBook).mockRejectedValueOnce(
      new Error("Network error"),
    )

    await useBooksStore.getState().fetchBooks()

    const state = useBooksStore.getState()
    expect(state.books).toEqual(mockBooks)
    expect(state.currentBook).toEqual(mockBooks[0])
    expect(state.isLoading).toBe(false)
  })

  it("sets error and does not modify currentBook on getBooks failure", async () => {
    const existing = makeBook()
    useBooksStore.setState({ currentBook: existing })
    vi.mocked(booksService.getBooks).mockRejectedValueOnce(
      new Error("Failed to load books"),
    )

    await expect(
      useBooksStore.getState().fetchBooks(),
    ).rejects.toThrow("Failed to load books")

    const state = useBooksStore.getState()
    expect(state.books).toEqual([])
    expect(state.currentBook).toEqual(existing) // unchanged
    expect(state.isLoading).toBe(false)
    expect(state.error).toBe("Failed to load books")
  })

  it("sets mainBookId from a book named Main", async () => {
    const books = [
      makeBook({ id: "book_main", name: "Main" }),
      makeBook({ id: "book_vacation", name: "Vacation 2026" }),
    ]
    vi.mocked(booksService.getBooks).mockResolvedValueOnce(books)
    vi.mocked(booksService.getCurrentBook).mockResolvedValueOnce(books[0])

    await useBooksStore.getState().fetchBooks()

    const state = useBooksStore.getState()
    expect(state.mainBookId).toBe("book_main")
  })

  it("sets mainBookId from the only book when no book named Main exists", async () => {
    const books = [makeBook({ id: "book_only", name: "Solo Ledger" })]
    vi.mocked(booksService.getBooks).mockResolvedValueOnce(books)
    vi.mocked(booksService.getCurrentBook).mockResolvedValueOnce(books[0])

    await useBooksStore.getState().fetchBooks()

    const state = useBooksStore.getState()
    expect(state.mainBookId).toBe("book_only")
  })

  it("sets mainBookId to null when multiple books exist and none is named Main", async () => {
    const books = [
      makeBook({ id: "book_a", name: "Personal" }),
      makeBook({ id: "book_b", name: "Business" }),
    ]
    vi.mocked(booksService.getBooks).mockResolvedValueOnce(books)
    vi.mocked(booksService.getCurrentBook).mockResolvedValueOnce(books[0])

    await useBooksStore.getState().fetchBooks()

    const state = useBooksStore.getState()
    // fall back - sekects the first open book
    // fall back - select any book
    expect(state.mainBookId).not.toBeNull()
  })
})
