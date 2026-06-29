// ---------------------------------------------------------------------------
// Unit tests — refresh() and useRefresh()
// ---------------------------------------------------------------------------

import { describe, expect, it, vi, beforeEach } from "vitest"
import { renderHook } from "@testing-library/react"
import type { GetTransactionsParams } from "@/features/offline/interfaces/ITransactionsService"

// ---------------------------------------------------------------------------
// Mocks for store fetch methods — defined before any vi.mock() calls
// ---------------------------------------------------------------------------

const fetchBooksMock = vi.fn()
const fetchCategoriesMock = vi.fn()
const fetchUsersMock = vi.fn()
const fetchTransactionsMock = vi.fn()

const lastParamsMock: GetTransactionsParams = { page: 1, bookId: "book_main" }

// ---------------------------------------------------------------------------
// Mock all four store modules so refresh() calls through our mocks
// ---------------------------------------------------------------------------

vi.mock("@/store", () => ({
  useBooksStore: {
    getState: () => ({ fetchBooks: fetchBooksMock }),
  },
  useCategoriesStore: {
    getState: () => ({ fetchCategories: fetchCategoriesMock }),
  },
  useUsersStore: {
    getState: () => ({ fetchUsers: fetchUsersMock }),
  },
  useTransactionsStore: {
    getState: () => ({
      lastParams: lastParamsMock,
      fetchTransactions: fetchTransactionsMock,
    }),
  },
}))

// ---------------------------------------------------------------------------
// Subject under test (imported after mocks are set up)
// ---------------------------------------------------------------------------

import { refresh, useRefresh } from "./useRefresh"

// ---------------------------------------------------------------------------
// Tests — refresh()
// ---------------------------------------------------------------------------

describe("refresh()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls fetchBooks when books target is set", async () => {
    fetchBooksMock.mockResolvedValueOnce([])
    await refresh({ books: true })
    expect(fetchBooksMock).toHaveBeenCalledTimes(1)
  })

  it("calls fetchTransactions with lastParams when transactions target is set", async () => {
    fetchTransactionsMock.mockResolvedValueOnce([])
    await refresh({ transactions: true })
    expect(fetchTransactionsMock).toHaveBeenCalledTimes(1)
    expect(fetchTransactionsMock).toHaveBeenCalledWith(lastParamsMock)
  })

  it("calls fetchCategories when categories target is set", async () => {
    fetchCategoriesMock.mockResolvedValueOnce([])
    await refresh({ categories: true })
    expect(fetchCategoriesMock).toHaveBeenCalledTimes(1)
  })

  it("calls fetchUsers when users target is set", async () => {
    fetchUsersMock.mockResolvedValueOnce([])
    await refresh({ users: true })
    expect(fetchUsersMock).toHaveBeenCalledTimes(1)
  })

  it("calls no store methods when targets is empty", async () => {
    await refresh({})
    expect(fetchBooksMock).not.toHaveBeenCalled()
    expect(fetchTransactionsMock).not.toHaveBeenCalled()
    expect(fetchCategoriesMock).not.toHaveBeenCalled()
    expect(fetchUsersMock).not.toHaveBeenCalled()
  })

  it("calls multiple stores when multiple targets are set", async () => {
    fetchBooksMock.mockResolvedValueOnce([])
    fetchTransactionsMock.mockResolvedValueOnce([])

    await refresh({ books: true, transactions: true })

    expect(fetchBooksMock).toHaveBeenCalledTimes(1)
    expect(fetchTransactionsMock).toHaveBeenCalledTimes(1)
    expect(fetchCategoriesMock).not.toHaveBeenCalled()
    expect(fetchUsersMock).not.toHaveBeenCalled()
  })

  it("does not propagate errors from individual store fetches", async () => {
    fetchBooksMock.mockRejectedValueOnce(new Error("Network error"))
    fetchCategoriesMock.mockResolvedValueOnce([])

    // Should not throw
    await expect(refresh({ books: true, categories: true })).resolves.toBeUndefined()

    // Both stores should have been called (books fails, categories succeeds)
    expect(fetchBooksMock).toHaveBeenCalledTimes(1)
    expect(fetchCategoriesMock).toHaveBeenCalledTimes(1)
  })

  it("continues refreshing remaining targets when one fails", async () => {
    fetchBooksMock.mockRejectedValueOnce(new Error("Network error"))
    fetchCategoriesMock.mockResolvedValueOnce([])
    fetchUsersMock.mockResolvedValueOnce([])

    await refresh({ books: true, categories: true, users: true })

    // All three should have been called despite books failing
    expect(fetchBooksMock).toHaveBeenCalledTimes(1)
    expect(fetchCategoriesMock).toHaveBeenCalledTimes(1)
    expect(fetchUsersMock).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Tests — useRefresh()
// ---------------------------------------------------------------------------

describe("useRefresh()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls refresh once on mount with the given targets", async () => {
    fetchBooksMock.mockResolvedValueOnce([])

    renderHook(() => useRefresh({ books: true }))

    // Wait for the async effect to settle
    await vi.waitFor(() => {
      expect(fetchBooksMock).toHaveBeenCalledTimes(1)
    })
  })

  it("calls refresh with empty targets (no-op) when passed empty object", async () => {
    renderHook(() => useRefresh({}))

    // No store method should be called
    await vi.waitFor(() => {
      expect(fetchBooksMock).not.toHaveBeenCalled()
      expect(fetchTransactionsMock).not.toHaveBeenCalled()
      expect(fetchCategoriesMock).not.toHaveBeenCalled()
      expect(fetchUsersMock).not.toHaveBeenCalled()
    })
  })

  it("only fires once even if the component re-renders", async () => {
    fetchBooksMock.mockResolvedValueOnce([])

    const { rerender } = renderHook(() => useRefresh({ books: true }))

    // Wait for initial mount effect
    await vi.waitFor(() => {
      expect(fetchBooksMock).toHaveBeenCalledTimes(1)
    })

    // Re-render (simulate parent re-render)
    rerender()

    // Should still only have been called once
    expect(fetchBooksMock).toHaveBeenCalledTimes(1)
  })
})
