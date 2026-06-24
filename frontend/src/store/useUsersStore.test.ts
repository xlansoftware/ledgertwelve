// ---------------------------------------------------------------------------
// Unit tests — useUsersStore
// ---------------------------------------------------------------------------

import { describe, expect, it, vi, beforeEach } from "vitest"
import { useUsersStore } from "./useUsersStore"
import type { UserSummary, GlobalShareResponse } from "@/types"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAddGlobalShare = vi.fn()
const mockRemoveGlobalShare = vi.fn()
const mockGetUsers = vi.fn()

vi.mock("@/features/offline", () => ({
  getFactory: () => ({
    books: {
      addGlobalShare: mockAddGlobalShare,
      removeGlobalShare: mockRemoveGlobalShare,
    },
    users: {
      getUsers: mockGetUsers,
    },
  }),
  isOfflineMode: () => false,
}))

const mockUsers: UserSummary[] = [
  { id: "usr_1", email: "john@example.com" },
  { id: "usr_2", email: "friend@example.com" },
]

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  useUsersStore.setState({
    users: [],
    isLoading: false,
    error: null,
  })
})

// ---------------------------------------------------------------------------
// Tests — addGlobalShare
// ---------------------------------------------------------------------------

describe("useUsersStore — addGlobalShare", () => {
  it("calls addGlobalShare on the service and refreshes users on success", async () => {
    mockAddGlobalShare.mockResolvedValueOnce({
      userId: "usr_2",
      email: "friend@example.com",
      affectedBooks: 2,
    } satisfies GlobalShareResponse)
    mockGetUsers.mockResolvedValueOnce(mockUsers)

    await useUsersStore.getState().addGlobalShare("friend@example.com")

    expect(mockAddGlobalShare).toHaveBeenCalledWith("friend@example.com")
    expect(mockGetUsers).toHaveBeenCalled()
    const state = useUsersStore.getState()
    expect(state.users).toEqual(mockUsers)
    expect(state.error).toBeNull()
  })

  it("sets error and does not refresh users on failure", async () => {
    mockAddGlobalShare.mockRejectedValueOnce(new Error("User not found"))
    useUsersStore.setState({ users: mockUsers })

    await expect(
      useUsersStore.getState().addGlobalShare("unknown@example.com"),
    ).rejects.toThrow("User not found")

    expect(mockGetUsers).not.toHaveBeenCalled()
    const state = useUsersStore.getState()
    expect(state.users).toEqual(mockUsers) // unchanged
    expect(state.error).toBe("User not found")
  })
})

// ---------------------------------------------------------------------------
// Tests — removeGlobalShare
// ---------------------------------------------------------------------------

describe("useUsersStore — removeGlobalShare", () => {
  it("calls removeGlobalShare on the service and refreshes users on success", async () => {
    mockRemoveGlobalShare.mockResolvedValueOnce(undefined)
    mockGetUsers.mockResolvedValueOnce([mockUsers[0]]) // only current user remains

    useUsersStore.setState({ users: mockUsers })

    await useUsersStore.getState().removeGlobalShare("usr_2")

    expect(mockRemoveGlobalShare).toHaveBeenCalledWith("usr_2")
    expect(mockGetUsers).toHaveBeenCalled()
    const state = useUsersStore.getState()
    expect(state.users).toEqual([mockUsers[0]])
    expect(state.error).toBeNull()
  })

  it("sets error and does not refresh users on failure", async () => {
    mockRemoveGlobalShare.mockRejectedValueOnce(new Error("Share not found"))
    useUsersStore.setState({ users: mockUsers })

    await expect(
      useUsersStore.getState().removeGlobalShare("usr_nonexistent"),
    ).rejects.toThrow("Share not found")

    expect(mockGetUsers).not.toHaveBeenCalled()
    const state = useUsersStore.getState()
    expect(state.users).toEqual(mockUsers) // unchanged
    expect(state.error).toBe("Share not found")
  })
})