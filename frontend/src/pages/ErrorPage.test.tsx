// ---------------------------------------------------------------------------
// Component tests — ErrorPage (route-level error boundary)
// ---------------------------------------------------------------------------

import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi, afterEach } from "vitest"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import ErrorPage from "./ErrorPage"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A component that always throws while rendering. */
function CrashingPage(): never {
  throw new Error("Minified React error #185")
}

function renderWithError(errorElement = <ErrorPage />) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <CrashingPage />,
        errorElement,
      },
    ],
    { initialEntries: ["/"] },
  )

  return render(<RouterProvider router={router} />)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ErrorPage", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders a friendly message instead of the default error screen", async () => {
    // React logs the caught render error to console — silence it for this test.
    vi.spyOn(console, "error").mockImplementation(() => {})

    renderWithError()

    expect(await screen.findByText("Something went wrong")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /go home/i })).toBeInTheDocument()
  })

  it("explains an infinite render loop and keeps details collapsed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    renderWithError()

    expect(
      await screen.findByText(/unexpected render loop/i),
    ).toBeInTheDocument()
    expect(screen.getByText("Technical details")).toBeInTheDocument()
    expect(screen.getByText("Minified React error #185")).toBeInTheDocument()
  })
})
