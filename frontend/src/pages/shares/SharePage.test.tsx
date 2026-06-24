// ---------------------------------------------------------------------------
// Component tests — SharePage
// ---------------------------------------------------------------------------

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { useAuthStore, useUsersStore } from "@/store"
import { ConfirmDialogProvider } from "@/components/common/dialog/ConfirmDialogContext"
import SharePage from "./SharePage"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
  return render(
    <ConfirmDialogProvider>
      <MemoryRouter initialEntries={["/shares"]}>
        <SharePage />
      </MemoryRouter>
    </ConfirmDialogProvider>,
  )
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()

  // Seed auth store as authenticated
  useAuthStore.setState({
    state: { status: "authenticated", user: { id: "usr_1", email: "john@example.com" } },
    isAuthenticated: true,
  })

  // Reset users store
  useUsersStore.setState({
    users: [],
    isLoading: false,
    error: null,
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SharePage", () => {
  it("renders the title and back button", () => {
    renderPage()
    expect(screen.getByText("Shared Users")).toBeInTheDocument()
    expect(screen.getByText("Back to Settings")).toBeInTheDocument()
  })

  it("shows empty state when no users are shared", () => {
    useUsersStore.setState({
      users: [{ id: "usr_1", email: "john@example.com" }],
    })
    renderPage()
    expect(
      screen.getByText(/No shared users yet/i),
    ).toBeInTheDocument()
  })

  it("renders the list of shared users", () => {
    useUsersStore.setState({
      users: [
        { id: "usr_1", email: "john@example.com" },
        { id: "usr_2", email: "friend@example.com" },
        { id: "usr_3", email: "another@example.com" },
      ],
    })
    renderPage()
    expect(screen.getByText("friend@example.com")).toBeInTheDocument()
    expect(screen.getByText("another@example.com")).toBeInTheDocument()
    // Current user should not be in the list
    expect(screen.queryByText("john@example.com")).not.toBeInTheDocument()
  })

  it("shows the correct count in the description", () => {
    useUsersStore.setState({
      users: [
        { id: "usr_1", email: "john@example.com" },
        { id: "usr_2", email: "friend@example.com" },
      ],
    })
    renderPage()
    expect(screen.getByText(/1 user\(s\) have access to all your books/i)).toBeInTheDocument()
  })

  it("calls addGlobalShare with the entered email and clears the input on success", async () => {
    const addSpy = vi.spyOn(useUsersStore.getState(), "addGlobalShare")
    useUsersStore.setState({
      users: [{ id: "usr_1", email: "john@example.com" }],
    })

    renderPage()

    const input = screen.getByLabelText("Email")
    fireEvent.change(input, { target: { value: "friend@example.com" } })
    fireEvent.click(screen.getByText("Add Share"))

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith("friend@example.com")
    })
  })

  it("shows inline error when add fails", async () => {
    vi.spyOn(useUsersStore.getState(), "addGlobalShare").mockRejectedValueOnce(
      new Error("User not found"),
    )
    useUsersStore.setState({
      users: [{ id: "usr_1", email: "john@example.com" }],
    })

    renderPage()

    const input = screen.getByLabelText("Email")
    fireEvent.change(input, { target: { value: "unknown@example.com" } })
    fireEvent.click(screen.getByText("Add Share"))

    await waitFor(() => {
      expect(screen.getByText("User not found")).toBeInTheDocument()
    })
  })

  it("shows confirmation dialog when remove is clicked", async () => {
    useUsersStore.setState({
      users: [
        { id: "usr_1", email: "john@example.com" },
        { id: "usr_2", email: "friend@example.com" },
      ],
    })

    renderPage()

    fireEvent.click(screen.getByText("Remove"))

    await waitFor(() => {
      expect(
        screen.getByText(
          /Are you sure you want to remove friend@example.com from all your books/i,
        ),
      ).toBeInTheDocument()
    })

    // Dialog should have Cancel and Remove buttons
    expect(screen.getByText("Cancel")).toBeInTheDocument()
    expect(screen.getAllByText("Remove")).toHaveLength(2)
  })

  it("calls removeGlobalShare when removal is confirmed", async () => {
    const removeSpy = vi.spyOn(useUsersStore.getState(), "removeGlobalShare").mockResolvedValueOnce()
    useUsersStore.setState({
      users: [
        { id: "usr_1", email: "john@example.com" },
        { id: "usr_2", email: "friend@example.com" },
      ],
    })

    renderPage()

    fireEvent.click(screen.getByText("Remove"))

    await waitFor(() => {
      expect(screen.getAllByText("Remove")).toHaveLength(2)
    })

    // Click the dialog's Remove button (the action button)
    const dialogRemoveButtons = screen.getAllByText("Remove")
    // The second one is the dialog action button
    fireEvent.click(dialogRemoveButtons[1])

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalledWith("usr_2")
    })
  })

  it("does not call removeGlobalShare when removal is cancelled", async () => {
    const removeSpy = vi.spyOn(useUsersStore.getState(), "removeGlobalShare")
    useUsersStore.setState({
      users: [
        { id: "usr_1", email: "john@example.com" },
        { id: "usr_2", email: "friend@example.com" },
      ],
    })

    renderPage()

    fireEvent.click(screen.getByText("Remove"))

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Cancel"))

    // Give a tick for any async effects
    await vi.waitFor(() => {
      expect(removeSpy).not.toHaveBeenCalled()
    })
  })
})