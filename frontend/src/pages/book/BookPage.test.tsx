// ---------------------------------------------------------------------------
// Component tests — BookPage (books overview page)
// ---------------------------------------------------------------------------

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { useBooksStore } from "@/store"
import type { BookDto } from "@/types"
import { books as mswBooks } from "@/mocks/handlers"
import BookPage from "./BookPage"

const { navigateSpy } = vi.hoisted(() => ({
  navigateSpy: vi.fn(),
}))

// Pre-seed the books store to simulate init having run
const seedOpenBooks: BookDto[] = [
  {
    id: "book_main",
    name: "Main",
    currency: "EUR",
    status: "open",
    ownerId: "usr_1",
    sharedWith: [],
    createdAt: "2026-01-01T10:00:00Z",
  },
  {
    id: "book_vacation",
    name: "Vacation 2026",
    currency: "EUR",
    status: "open",
    ownerId: "usr_1",
    sharedWith: [],
    createdAt: "2026-03-15T10:00:00Z",
  },
]

const closedBooks: BookDto[] = [
  {
    id: "book_closed_1",
    name: "Old Project",
    currency: "EUR",
    status: "closed",
    ownerId: "usr_1",
    sharedWith: [],
    createdAt: "2026-01-01T10:00:00Z",
    closedAt: "2026-06-01T10:00:00Z",
  },
  {
    id: "book_closed_2",
    name: "Vacation 2025",
    currency: "USD",
    status: "closed",
    ownerId: "usr_1",
    sharedWith: [],
    createdAt: "2025-03-15T10:00:00Z",
    closedAt: "2026-03-15T10:00:00Z",
  },
]

// Closed books in MSW internal format (Date objects for dates)
const mswClosedBooks = closedBooks.map(b => ({
  id: b.id,
  name: b.name,
  currency: b.currency,
  status: b.status as "open" | "closed",
  ownerId: b.ownerId,
  sharedWith: [] as { userId: string; permission: "view" | "edit" }[],
  createdAt: new Date(b.createdAt),
  closedAt: b.closedAt ? new Date(b.closedAt) : undefined,
}))

// Mock the hook
const mockUseClosedBookBalances = vi.fn()

vi.mock("@/features/books/hooks/useClosedBookBalances", () => ({
  useClosedBookBalances: (...args: unknown[]) => mockUseClosedBookBalances(...args),
}))

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  }
})

/** Add closed books to the MSW in-memory store (used by fetchBooks). */
function seedMswClosedBooks() {
  for (const book of mswClosedBooks) {
    if (!mswBooks.find((b) => b.id === book.id)) {
      mswBooks.push(book)
    }
  }
}

/** Remove any books beyond the default seed (book_main, book_vacation). */
function resetMswBooks() {
  // Keep only the original 2 default books
  const defaultIds = new Set(["book_main", "book_vacation"])
  for (let i = mswBooks.length - 1; i >= 0; i--) {
    if (!defaultIds.has(mswBooks[i].id)) {
      mswBooks.splice(i, 1)
    }
  }
}

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        path: "/books",
        element: <BookPage />,
      },
      {
        path: "/edit-book/:bookId",
        element: <div data-testid="edit-book-page">Edit Book Page</div>,
      },
      {
        path: "/books/new",
        element: <div data-testid="create-book-page">Create Book Page</div>,
      },
    ],
    {
      initialEntries: ["/books"],
    },
  )

  return render(<RouterProvider router={router} />)
}

describe("BookPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock: no closed books, not loading
    mockUseClosedBookBalances.mockReturnValue({ balances: {}, isLoading: false })
    // Seed the store with books as if initializeApp ran
    useBooksStore.setState({ books: seedOpenBooks, isLoading: false, error: null, currentBook: seedOpenBooks[0] })
  })

  afterEach(() => {
    resetMswBooks()
  })

  // -----------------------------------------------------------------------
  // Existing tests (preserved)
  // -----------------------------------------------------------------------

  it("renders book cards with an Edit button for each book", async () => {
    renderPage()

    // Wait for books to load
    await waitFor(() => {
      expect(screen.getByText("Main")).toBeInTheDocument()
    })

    expect(screen.getByText("Vacation 2026")).toBeInTheDocument()

    // Each book card should have an Edit button
    const editButtons = screen.getAllByRole("button", { name: "Edit" })
    expect(editButtons.length).toBeGreaterThanOrEqual(2)
  })

  it("clicking Edit navigates to /edit-book/:bookId", async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("Main")).toBeInTheDocument()
    })

    // Click the first Edit button
    const editButtons = screen.getAllByRole("button", { name: "Edit" })
    fireEvent.click(editButtons[0])

    expect(navigateSpy).toHaveBeenCalledWith("/edit-book/book_main")
  })

  it("clicking Edit on Vacation book navigates to correct path", async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText("Vacation 2026")).toBeInTheDocument()
    })

    const editButtons = screen.getAllByRole("button", { name: "Edit" })
    const vacationEditBtn = editButtons.find(
      (btn) =>
        btn.closest("[class*='card']")?.textContent?.includes("Vacation 2026") ||
        btn.closest("div")?.previousElementSibling?.textContent?.includes("Vacation 2026"),
    )

    // Click the second edit button (Vacation)
    if (vacationEditBtn) {
      fireEvent.click(vacationEditBtn)
    } else {
      fireEvent.click(editButtons[1])
    }

    expect(navigateSpy).toHaveBeenCalledWith("/edit-book/book_vacation")
  })

  // -----------------------------------------------------------------------
  // Closed book tests
  // -----------------------------------------------------------------------

  describe("closed books", () => {
    it("renders closed books as compact single-row cards", async () => {
      const allBooks = [...seedOpenBooks, ...closedBooks]
      useBooksStore.setState({ books: allBooks })
      mockUseClosedBookBalances.mockReturnValue({
        balances: { book_closed_1: 1250, book_closed_2: -500 },
        isLoading: false,
      })

      seedMswClosedBooks()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText("Old Project")).toBeInTheDocument()
      })

      expect(screen.getByText("Vacation 2025")).toBeInTheDocument()

      // Closed books should have "Closed" badges
      const closedBadges = screen.getAllByText("Closed")
      expect(closedBadges.length).toBe(2)
    })

    it("shows a separator between open and closed sections", async () => {
      const allBooks = [...seedOpenBooks, ...closedBooks]
      useBooksStore.setState({ books: allBooks })
      mockUseClosedBookBalances.mockReturnValue({
        balances: { book_closed_1: 1250, book_closed_2: -500 },
        isLoading: false,
      })

      seedMswClosedBooks()
      renderPage()

      // The separator is the horizontal rule element
      const separators = document.querySelectorAll('[data-slot="separator"]')
      expect(separators.length).toBe(1)
    })

    it("does not show a Select button on closed books", async () => {
      const allBooks = [...seedOpenBooks, ...closedBooks]
      useBooksStore.setState({ books: allBooks })
      mockUseClosedBookBalances.mockReturnValue({
        balances: { book_closed_1: 1250, book_closed_2: -500 },
        isLoading: false,
      })

      seedMswClosedBooks()
      renderPage()

      // Open books should have Select buttons
      const selectButtons = screen.getAllByRole("button", { name: /select|current book/i })
      // Only 2 open books, so 2 select/current-book buttons
      expect(selectButtons.length).toBe(2)
    })

    it("shows Edit button on closed books", async () => {
      const allBooks = [...seedOpenBooks, ...closedBooks]
      useBooksStore.setState({ books: allBooks })
      mockUseClosedBookBalances.mockReturnValue({
        balances: { book_closed_1: 1250, book_closed_2: -500 },
        isLoading: false,
      })

      seedMswClosedBooks()
      renderPage()

      // All 4 books should have Edit buttons
      const editButtons = screen.getAllByRole("button", { name: "Edit" })
      expect(editButtons.length).toBe(4)
    })

    it("displays the balance value for closed books", async () => {
      const allBooks = [...seedOpenBooks, ...closedBooks]
      useBooksStore.setState({ books: allBooks })
      mockUseClosedBookBalances.mockReturnValue({
        balances: { book_closed_1: 1250, book_closed_2: -500 },
        isLoading: false,
      })

      seedMswClosedBooks()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText("Old Project")).toBeInTheDocument()
      })

      // The balance values should be visible
      expect(screen.getByText("1,250.00")).toBeInTheDocument()
      // -500 should be displayed as (500.00) with brackets
      expect(screen.getByText("(500.00)")).toBeInTheDocument()
    })

    it("displays em dash for balances while loading", async () => {
      const allBooks = [...seedOpenBooks, ...closedBooks]
      useBooksStore.setState({ books: allBooks })
      mockUseClosedBookBalances.mockReturnValue({
        balances: { book_closed_1: null, book_closed_2: null },
        isLoading: true,
      })

      seedMswClosedBooks()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText("Old Project")).toBeInTheDocument()
      })

      // All closed books should show em dash for balance while loading
      const emDashes = screen.getAllByText("\u2014")
      // At least 2 em dashes (one per closed book, plus the currency one from open books)
      expect(emDashes.length).toBeGreaterThanOrEqual(2)
    })

    it("sorts closed books by closedAt descending", async () => {
      // Add a third closed book with a middle closedAt date
      const thirdClosed: BookDto = {
        id: "book_closed_3",
        name: "Summer Trip",
        currency: "EUR",
        status: "closed",
        ownerId: "usr_1",
        sharedWith: [],
        createdAt: "2026-02-01T10:00:00Z",
        closedAt: "2026-04-15T10:00:00Z",
      }
      const allBooks = [...seedOpenBooks, ...closedBooks, thirdClosed]
      useBooksStore.setState({ books: allBooks })
      mockUseClosedBookBalances.mockReturnValue({
        balances: { book_closed_1: 100, book_closed_2: 200, book_closed_3: 300 },
        isLoading: false,
      })

      // Also seed MSW with the third closed book
      seedMswClosedBooks()
      mswBooks.push({
        id: "book_closed_3",
        name: "Summer Trip",
        currency: "EUR",
        status: "closed" as const,
        ownerId: "usr_1",
        sharedWith: [],
        createdAt: new Date("2026-02-01T10:00:00Z"),
        closedAt: new Date("2026-04-15T10:00:00Z"),
      })
      renderPage()

      await waitFor(() => {
        expect(screen.getByText("Summer Trip")).toBeInTheDocument()
      })

      // Expected order: Old Project (Jun), Summer Trip (Apr), Vacation 2025 (Mar)
      const cards = screen.getAllByText("Closed")
      // Walk up to the parent card elements and check text order
      const cardContents = cards.map((badge) => badge.closest("[class*='card']")?.textContent ?? "")
      const oldProjectIdx = cardContents.findIndex((c) => c.includes("Old Project"))
      const summerTripIdx = cardContents.findIndex((c) => c.includes("Summer Trip"))
      const vacationIdx = cardContents.findIndex((c) => c.includes("Vacation 2025"))

      expect(oldProjectIdx).toBeLessThan(summerTripIdx)
      expect(summerTripIdx).toBeLessThan(vacationIdx)
    })
  })

  describe("edge cases", () => {
    it("renders no separator when there are no closed books", async () => {
      renderPage()

      const separators = document.querySelectorAll('[data-slot="separator"]')
      expect(separators.length).toBe(0)
    })

    it("renders all books as compact cards when all books are closed", async () => {
      useBooksStore.setState({ books: closedBooks })
      mockUseClosedBookBalances.mockReturnValue({
        balances: { book_closed_1: 1250, book_closed_2: -500 },
        isLoading: false,
      })

      // Replace MSW books with only closed books (no open books)
      mswBooks.length = 0
      mswBooks.push(...mswClosedBooks)
      renderPage()

      await waitFor(() => {
        expect(screen.getByText("Old Project")).toBeInTheDocument()
      })

      expect(screen.getByText("Vacation 2025")).toBeInTheDocument()

      // No separator when there's nothing to separate
      const separators = document.querySelectorAll('[data-slot="separator"]')
      expect(separators.length).toBe(0)

      // No Select buttons (all closed)
      const selectButtons = screen.queryAllByRole("button", { name: /select|current book/i })
      expect(selectButtons.length).toBe(0)
    })

    it("shows New book button below all sections", async () => {
      const allBooks = [...seedOpenBooks, ...closedBooks]
      useBooksStore.setState({ books: allBooks })
      mockUseClosedBookBalances.mockReturnValue({
        balances: { book_closed_1: 1250, book_closed_2: -500 },
        isLoading: false,
      })

      seedMswClosedBooks()
      renderPage()

      const newBookButton = screen.getByRole("button", { name: "New book" })
      expect(newBookButton).toBeInTheDocument()

      // Clicking New book navigates to /books/new
      fireEvent.click(newBookButton)
      expect(navigateSpy).toHaveBeenCalledWith("/books/new")
    })
  })
})
