// ---------------------------------------------------------------------------
// Component tests — CreateBookPage
// ---------------------------------------------------------------------------

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router-dom"
import CreateBookPage from "./CreateBookPage"

// Create spies at hoisted time so they are available when vi.mock factories run
const { toastSuccessSpy, navigateSpy } = vi.hoisted(() => ({
  toastSuccessSpy: vi.fn(),
  navigateSpy: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: { success: (...args: unknown[]) => toastSuccessSpy(...args) },
}))

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  }
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/books/new"]}>
      <CreateBookPage />
    </MemoryRouter>,
  )
}

describe("CreateBookPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the form with name input, currency combobox, Cancel link, and Create button", () => {
    renderPage()

    expect(screen.getByLabelText("Book name")).toBeInTheDocument()
    expect(screen.getByLabelText("Currency")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
  })

  it("shows validation error when submitting with an empty name", async () => {
    renderPage()

    const createBtn = screen.getByRole("button", { name: "Create" })
    fireEvent.click(createBtn)

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument()
    })
  })

  it("submits successfully and redirects to /books + shows success toast", async () => {
    renderPage()

    const nameInput = screen.getByLabelText("Book name")
    fireEvent.change(nameInput, { target: { value: "My New Book" } })

    const createBtn = screen.getByRole("button", { name: "Create" })
    fireEvent.click(createBtn)

    // On success, the page navigates away
    await waitFor(() => {
      expect(toastSuccessSpy).toHaveBeenCalledWith("Book created")
    })

    expect(navigateSpy).toHaveBeenCalledWith("/books")
  })

  it("displays API error when the server returns an error", async () => {
    const { http, HttpResponse } = await import("msw")
    const { server } = await import("@/test-setup")

    server.use(
      http.post("/api/v1/books", () => {
        return HttpResponse.json(
          { error: "A book with this name already exists" },
          { status: 409 },
        )
      }),
    )

    renderPage()

    const nameInput = screen.getByLabelText("Book name")
    fireEvent.change(nameInput, { target: { value: "Duplicate" } })

    const createBtn = screen.getByRole("button", { name: "Create" })
    fireEvent.click(createBtn)

    await waitFor(() => {
      expect(
        screen.getByText("A book with this name already exists"),
      ).toBeInTheDocument()
    })
  })

  it("cancelling navigates back to /books", async () => {
    renderPage()

    const cancelBtn = screen.getByRole("button", { name: "Cancel" })
    fireEvent.click(cancelBtn)

    expect(navigateSpy).toHaveBeenCalledWith("/books")
  })
})