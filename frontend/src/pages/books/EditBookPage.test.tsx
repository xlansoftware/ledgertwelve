// ---------------------------------------------------------------------------
// Component tests — EditBookPage
// ---------------------------------------------------------------------------

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { http, HttpResponse } from "msw"
import { server } from "@/test-setup"
import EditBookPage from "./EditBookPage"
import { useBooksStore, useCategoriesStore } from "@/store"
import { ConfirmDialogProvider } from "@/components/common/dialog/ConfirmDialogContext"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const { toastSuccessSpy, toastErrorSpy } = vi.hoisted(() => ({
  toastSuccessSpy: vi.fn(),
  toastErrorSpy: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessSpy(...args),
    error: (...args: unknown[]) => toastErrorSpy(...args),
  },
}))

/** Stub for the books page */
function BooksPageStub() {
  return <div data-testid="books-page">Books Page</div>
}

/**
 * Create a router with the edit book page and a books stub,
 * then render it via RouterProvider.
 */
function renderWithRouter(bookId = "book_vacation") {
  const router = createMemoryRouter(
    [
      {
        path: "/edit-book/:bookId",
        element: <EditBookPage />,
      },
      {
        path: "/books",
        element: <BooksPageStub />,
      },
    ],
    {
      initialEntries: [`/edit-book/${bookId}`],
    },
  )

  return render(
    <ConfirmDialogProvider>
      <RouterProvider router={router} />
    </ConfirmDialogProvider>,
  )
}

const MOCK_BOOK = {
  id: "book_vacation",
  name: "Vacation 2026",
  currency: "EUR",
  status: "open" as const,
  ownerId: "usr_1",
  sharedWith: [],
  createdAt: "2026-03-15T10:00:00Z",
}

const MOCK_STATS = {
  transactionCount: 42,
  totalSum: -1250.75,
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()

  // Reset store state
  useBooksStore.setState({
    books: [],
    currentBook: null,
    isLoading: false,
    error: null,
  })

  // Seed categories
  useCategoriesStore.setState({
    categories: [
      { id: "cat_1", name: "Groceries", recurring: false, color: "#fde68a", icon: "shopping-cart", createdAt: "2026-01-01T00:00:00Z", order: 1 },
      { id: "cat_2", name: "Transfers", recurring: false, color: "#a5b4fc", icon: "arrows", createdAt: "2026-01-01T00:00:00Z", order: 2 },
    ],
    isLoading: false,
    error: null,
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EditBookPage", () => {
  it("shows a loading skeleton while fetching data", () => {
    useBooksStore.setState({ isLoading: true })

    renderWithRouter()

    const skeletons = document.querySelectorAll("[data-slot='skeleton']")
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it("shows error message with Back to books button when fetch fails", async () => {
    server.use(
      http.get("/api/v1/books/:bookId", () => {
        return HttpResponse.json(
          { error: "Book not found" },
          { status: 404 },
        )
      }),
    )

    renderWithRouter("book_invalid")

    await waitFor(() => {
      expect(screen.getByText("Book not found")).toBeInTheDocument()
    })

    expect(screen.getByText("Back to books")).toBeInTheDocument()
  })

  it("pre-populates form fields with fetched book data and shows stats", async () => {
    server.use(
      http.get("/api/v1/books/:bookId", () => {
        return HttpResponse.json({ data: MOCK_BOOK })
      }),
      http.get("/api/v1/books/:bookId/stats", () => {
        return HttpResponse.json({ data: MOCK_STATS })
      }),
    )

    renderWithRouter("book_vacation")

    // Wait for form to be populated
    await waitFor(() => {
      const nameInput = screen.getByLabelText("Name")
      expect(nameInput).toHaveValue("Vacation 2026")
    })

    // Check currency
    const currencyInput = screen.getByLabelText("Currency")
    expect(currencyInput).toHaveValue("EUR")

    // Check stats
    expect(screen.getByText("42")).toBeInTheDocument()
    // expect(screen.getByText(/-1,250\.75.*/)).toBeInTheDocument()

    // Check created date
    expect(screen.getByText(/March 15, 2026/)).toBeInTheDocument()

    // Page title
    expect(screen.getByText("Edit Book")).toBeInTheDocument()

    // Save and Cancel buttons
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()

    // Status section
    expect(screen.getByText("Open")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Close book" }),
    ).toBeInTheDocument()

    // Danger zone
    expect(
      screen.getByRole("button", { name: "Delete book" }),
    ).toBeInTheDocument()
  })

  it("navigates to /books when Cancel is clicked", async () => {
    server.use(
      http.get("/api/v1/books/:bookId", () => {
        return HttpResponse.json({ data: MOCK_BOOK })
      }),
      http.get("/api/v1/books/:bookId/stats", () => {
        return HttpResponse.json({ data: MOCK_STATS })
      }),
    )

    renderWithRouter("book_vacation")

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("Vacation 2026")
    })

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.getByTestId("books-page")).toBeInTheDocument()
  })

  it("saves successfully and navigates to /books with success toast", async () => {
    server.use(
      http.get("/api/v1/books/:bookId", () => {
        return HttpResponse.json({ data: MOCK_BOOK })
      }),
      http.get("/api/v1/books/:bookId/stats", () => {
        return HttpResponse.json({ data: MOCK_STATS })
      }),
    )

    renderWithRouter("book_vacation")

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("Vacation 2026")
    })

    // Change the name
    const nameInput = screen.getByLabelText("Name")
    fireEvent.change(nameInput, { target: { value: "Vacation Spain" } })

    // Click Save
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledWith("Book updated")
    })
  })

  it("shows error banner when save fails", async () => {
    server.use(
      http.get("/api/v1/books/:bookId", () => {
        return HttpResponse.json({ data: MOCK_BOOK })
      }),
      http.get("/api/v1/books/:bookId/stats", () => {
        return HttpResponse.json({ data: MOCK_STATS })
      }),
      http.put("/api/v1/books/:bookId", () => {
        return HttpResponse.json(
          { error: "Failed to update book" },
          { status: 500 },
        )
      }),
    )

    renderWithRouter("book_vacation")

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("Vacation 2026")
    })

    // Click Save
    fireEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(screen.getByTestId("save-error")).toBeInTheDocument()
    })

    expect(screen.getByTestId("save-error")).toHaveTextContent(
      "Failed to update book",
    )

    // Should NOT have navigated away
    expect(screen.queryByTestId("books-page")).not.toBeInTheDocument()
  })

  it("opens CloseBookDialog when Close book is clicked", async () => {
    server.use(
      http.get("/api/v1/books/:bookId", () => {
        return HttpResponse.json({ data: MOCK_BOOK })
      }),
      http.get("/api/v1/books/:bookId/stats", () => {
        return HttpResponse.json({ data: MOCK_STATS })
      }),
    )

    renderWithRouter("book_vacation")

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("Vacation 2026")
    })

    // Click Close book
    fireEvent.click(screen.getByRole("button", { name: "Close book" }))

    // The dialog should appear
    await waitFor(() => {
      expect(
        screen.getByText(/Close "Vacation 2026"/),
      ).toBeInTheDocument()
    })
  })

  it("shows Reopen button for closed books", async () => {
    const closedBook = { ...MOCK_BOOK, status: "closed" as const }

    server.use(
      http.get("/api/v1/books/:bookId", () => {
        return HttpResponse.json({ data: closedBook })
      }),
      http.get("/api/v1/books/:bookId/stats", () => {
        return HttpResponse.json({ data: MOCK_STATS })
      }),
    )

    renderWithRouter("book_vacation")

    await waitFor(() => {
      expect(screen.getByText("Closed")).toBeInTheDocument()
    })

    expect(
      screen.getByRole("button", { name: "Reopen book" }),
    ).toBeInTheDocument()
  })

  it("disables Close book and Delete book for Main book", async () => {
    const mainBook = {
      id: "book_main",
      name: "Main",
      currency: "EUR",
      status: "open" as const,
      ownerId: "usr_1",
      sharedWith: [],
      createdAt: "2026-01-01T10:00:00Z",
    }

    server.use(
      http.get("/api/v1/books/:bookId", () => {
        return HttpResponse.json({ data: mainBook })
      }),
      http.get("/api/v1/books/:bookId/stats", () => {
        return HttpResponse.json({ data: { transactionCount: 1000, totalSum: 5000 } })
      }),
    )

    renderWithRouter("book_main")

    await waitFor(() => {
      expect(screen.getByLabelText("Name")).toHaveValue("Main")
    })

    const closeBtn = screen.getByRole("button", { name: "Close book" })
    expect(closeBtn).toBeDisabled()

    const deleteBtn = screen.getByRole("button", { name: "Delete book" })
    expect(deleteBtn).toBeDisabled()
  })
})