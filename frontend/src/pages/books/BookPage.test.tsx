// ---------------------------------------------------------------------------
// Component tests — BookPage (books overview page)
// ---------------------------------------------------------------------------

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import BookPage from "./BookPage"

const { navigateSpy } = vi.hoisted(() => ({
  navigateSpy: vi.fn(),
}))

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  }
})

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
  })

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
})