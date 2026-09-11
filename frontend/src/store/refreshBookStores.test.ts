// ---------------------------------------------------------------------------
// Unit tests — refreshBookStores
// ---------------------------------------------------------------------------

import { describe, expect, it, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mocks for the stores touched by refreshBookStores
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  resetForBook: vi.fn(),
  fetchCategories: vi.fn(),
  fetchUsers: vi.fn(),
}))

vi.mock("./useTransactionsStore", () => ({
  useTransactionsStore: { getState: () => ({ resetForBook: mocks.resetForBook }) },
}))

vi.mock("./useCategoriesStore", () => ({
  useCategoriesStore: { getState: () => ({ fetchCategories: mocks.fetchCategories }) },
}))

vi.mock("./useUsersStore", () => ({
  useUsersStore: { getState: () => ({ fetchUsers: mocks.fetchUsers }) },
}))

// Subject under test (imported after mocks are set up)
import { refreshBookStores } from "./refreshBookStores"

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mocks.resetForBook.mockResolvedValue([])
  mocks.fetchCategories.mockResolvedValue([])
  mocks.fetchUsers.mockResolvedValue([])
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("refreshBookStores", () => {
  it("refreshes the book-scoped and global stores for the given book", async () => {
    await refreshBookStores("book_vacation")

    expect(mocks.resetForBook).toHaveBeenCalledTimes(1)
    expect(mocks.resetForBook).toHaveBeenCalledWith("book_vacation")
    expect(mocks.fetchCategories).toHaveBeenCalledTimes(1)
    expect(mocks.fetchUsers).toHaveBeenCalledTimes(1)
  })

  it("does not reject when a store refresh fails", async () => {
    mocks.resetForBook.mockRejectedValueOnce(new Error("transactions failed"))

    await expect(refreshBookStores("book_vacation")).resolves.toBeUndefined()

    // Remaining stores are still refreshed
    expect(mocks.fetchCategories).toHaveBeenCalledTimes(1)
    expect(mocks.fetchUsers).toHaveBeenCalledTimes(1)
  })
})
