// ---------------------------------------------------------------------------
// Unit tests — useTransactionsStore
// ---------------------------------------------------------------------------

import { describe, expect, it, vi, beforeEach } from "vitest"
import { useTransactionsStore } from "./useTransactionsStore"
import * as transactionsService from "@/services/transactionsService"
import type { TransactionDto } from "@/types"
import type { PaginatedTransactions } from "@/services/transactionsService"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTx(overrides: Partial<TransactionDto> = {}): TransactionDto {
  return {
    id: "tx_test",
    bookId: "book_main",
    userId: "usr_1",
    dateTime: "2026-06-01T12:00:00Z",
    amount: -50,
    createdAt: "2026-06-01T12:00:00Z",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/services/transactionsService", () => ({
  getTransactions: vi.fn(),
  getTransaction: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}))

vi.mock("@/store/useUsersStore", () => ({
  useUsersStore: {
    getState: vi.fn(() => ({
      users: [
        { id: "usr_1", email: "john@example.com" },
        { id: "usr_2", email: "friend@example.com" },
      ],
    })),
  },
}))

vi.mock("@/store/useCategoriesStore", () => ({
  useCategoriesStore: {
    getState: vi.fn(() => ({
      categories: [
        { id: "cat_1", name: "Groceries" },
        { id: "cat_2", name: "Rent" },
      ],
    })),
  },
}))

const mockGetTransactions = vi.mocked(transactionsService.getTransactions)
const mockCreateTransaction = vi.mocked(transactionsService.createTransaction)

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  useTransactionsStore.setState({
    transactions: [],
    currentTransaction: null,
    isLoading: false,
    error: null,
    page: 1,
    pageSize: 50,
    total: 0,
    hasMore: false,
    isLoadingMore: false,
    epoch: 0,
    loadMoreError: null,
    lastParams: {},
    currentFilter: {},
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useTransactionsStore", () => {
  describe("fetchTransactions", () => {
    it("resets list and page to 1 on fetch", async () => {
      // Pre-populate with some data
      useTransactionsStore.setState({
        transactions: [makeTx({ id: "old_1" })],
        page: 3,
        total: 1,
        hasMore: false,
      })

      mockGetTransactions.mockResolvedValueOnce({
        items: [makeTx({ id: "new_1" }), makeTx({ id: "new_2" })],
        page: 1,
        pageSize: 50,
        total: 2,
      })

      await useTransactionsStore.getState().fetchTransactions({ bookId: "book_main" })

      const state = useTransactionsStore.getState()
      expect(state.transactions).toHaveLength(2)
      expect(state.transactions[0].id).toBe("new_1")
      expect(state.page).toBe(1)
      expect(state.total).toBe(2)
    })

    it("sets hasMore when total exceeds page size", async () => {
      mockGetTransactions.mockResolvedValueOnce({
        items: [makeTx()],
        page: 1,
        pageSize: 50,
        total: 142,
      })

      await useTransactionsStore.getState().fetchTransactions()

      expect(useTransactionsStore.getState().hasMore).toBe(true)
    })

    it("clears hasMore when total is fully loaded", async () => {
      mockGetTransactions.mockResolvedValueOnce({
        items: [makeTx()],
        page: 1,
        pageSize: 50,
        total: 1,
      })

      await useTransactionsStore.getState().fetchTransactions()

      expect(useTransactionsStore.getState().hasMore).toBe(false)
    })

    it("increments epoch on each successful fetch", async () => {
      mockGetTransactions.mockResolvedValueOnce({
        items: [makeTx()],
        page: 1,
        pageSize: 50,
        total: 1,
      })

      const epochBefore = useTransactionsStore.getState().epoch
      await useTransactionsStore.getState().fetchTransactions()

      expect(useTransactionsStore.getState().epoch).toBe(epochBefore + 1)
    })

    it("resets isLoadingMore and loadMoreError on fetch", async () => {
      useTransactionsStore.setState({
        isLoadingMore: true,
        loadMoreError: "Previous error",
      })

      mockGetTransactions.mockResolvedValueOnce({
        items: [makeTx()],
        page: 1,
        pageSize: 50,
        total: 1,
      })

      await useTransactionsStore.getState().fetchTransactions()

      expect(useTransactionsStore.getState().isLoadingMore).toBe(false)
      expect(useTransactionsStore.getState().loadMoreError).toBeNull()
    })
  })

  describe("loadMore", () => {
    it("is a no-op when hasMore is false", async () => {
      useTransactionsStore.setState({
        transactions: [makeTx()],
        page: 1,
        total: 1,
        hasMore: false,
      })

      await useTransactionsStore.getState().loadMore()

      expect(mockGetTransactions).not.toHaveBeenCalled()
    })

    it("is a no-op when isLoadingMore is true", async () => {
      useTransactionsStore.setState({
        transactions: [makeTx()],
        page: 1,
        total: 100,
        hasMore: true,
        isLoadingMore: true,
      })

      await useTransactionsStore.getState().loadMore()

      expect(mockGetTransactions).not.toHaveBeenCalled()
    })

    it("appends items when hasMore is true", async () => {
      const page1 = [makeTx({ id: "tx_1" }), makeTx({ id: "tx_2" })]
      const page2 = [makeTx({ id: "tx_3" }), makeTx({ id: "tx_4" })]

      useTransactionsStore.setState({
        transactions: page1,
        page: 1,
        pageSize: 2,
        total: 4,
        hasMore: true,
        lastParams: { bookId: "book_main" },
      })

      mockGetTransactions.mockResolvedValueOnce({
        items: page2,
        page: 2,
        pageSize: 2,
        total: 4,
      })

      await useTransactionsStore.getState().loadMore()

      const state = useTransactionsStore.getState()
      expect(state.transactions).toHaveLength(4)
      expect(state.transactions[2].id).toBe("tx_3")
      expect(state.transactions[3].id).toBe("tx_4")
      expect(state.page).toBe(2)
    })

    it("sets hasMore to false when total is reached", async () => {
      const page1 = [makeTx({ id: "tx_1" })]
      const page2 = [makeTx({ id: "tx_2" })]

      useTransactionsStore.setState({
        transactions: page1,
        page: 1,
        pageSize: 1,
        total: 2,
        hasMore: true,
        lastParams: { bookId: "book_main" },
      })

      mockGetTransactions.mockResolvedValueOnce({
        items: page2,
        page: 2,
        pageSize: 1,
        total: 2,
      })

      await useTransactionsStore.getState().loadMore()

      expect(useTransactionsStore.getState().hasMore).toBe(false)
    })

    it("increments page when calling loadMore", async () => {
      const page1 = [makeTx({ id: "tx_1" })]
      const page2 = [makeTx({ id: "tx_2" })]

      useTransactionsStore.setState({
        transactions: page1,
        page: 1,
        pageSize: 1,
        total: 3,
        hasMore: true,
        lastParams: { bookId: "book_main" },
      })

      mockGetTransactions.mockResolvedValueOnce({
        items: page2,
        page: 2,
        pageSize: 1,
        total: 3,
      })

      await useTransactionsStore.getState().loadMore()

      // Next call should request page 3
      mockGetTransactions.mockResolvedValueOnce({
        items: [makeTx({ id: "tx_3" })],
        page: 3,
        pageSize: 1,
        total: 3,
      })

      await useTransactionsStore.getState().loadMore()

      expect(mockGetTransactions).toHaveBeenLastCalledWith({
        bookId: "book_main",
        page: 3,
      })
    })

    it("guards against stale responses after fetchTransactions", async () => {
      const page1 = [makeTx({ id: "tx_1" })]
      const page2 = [makeTx({ id: "tx_2" })]
      const page2Alt = [makeTx({ id: "tx_2_alt" })]

      useTransactionsStore.setState({
        transactions: page1,
        page: 1,
        pageSize: 1,
        total: 5,
        hasMore: true,
        lastParams: { bookId: "book_main" },
      })

      // Start loadMore but don't resolve yet
      let resolveLoadMore!: (value: unknown) => void
      const loadMorePromise = new Promise((resolve) => {
        resolveLoadMore = resolve
      })
      mockGetTransactions.mockReturnValueOnce(loadMorePromise as Promise<PaginatedTransactions>)

      // Initiate loadMore
      const loadMoreCall = useTransactionsStore.getState().loadMore()

      // While loadMore is in flight, user switches books (fetchTransactions resets)
      mockGetTransactions.mockResolvedValueOnce({
        items: page2Alt,
        page: 1,
        pageSize: 1,
        total: 1,
      })
      await useTransactionsStore.getState().fetchTransactions({ bookId: "book_other" })

      expect(useTransactionsStore.getState().transactions[0].id).toBe("tx_2_alt")

      // Now resolve the stale loadMore response
      resolveLoadMore({
        items: page2,
        page: 2,
        pageSize: 1,
        total: 5,
      })

      // Wait for the stale call to complete
      await loadMoreCall

      // The stale response should be discarded — transactions should still be from the new book
      const state = useTransactionsStore.getState()
      expect(state.transactions).toHaveLength(1)
      expect(state.transactions[0].id).toBe("tx_2_alt")
    })

    it("sets loadMoreError on failure without affecting transactions", async () => {
      const page1 = [makeTx({ id: "tx_1" })]
      mockGetTransactions.mockRejectedValueOnce(new Error("Network error"))

      useTransactionsStore.setState({
        transactions: page1,
        page: 1,
        pageSize: 1,
        total: 3,
        hasMore: true,
        lastParams: { bookId: "book_main" },
      })

      await useTransactionsStore.getState().loadMore()

      const state = useTransactionsStore.getState()
      expect(state.loadMoreError).toBe("Network error")
      expect(state.isLoadingMore).toBe(false)
      // Existing transactions intact
      expect(state.transactions).toHaveLength(1)
      expect(state.transactions[0].id).toBe("tx_1")
      // Global error should NOT be set
      expect(state.error).toBeNull()
    })
  })

  describe("createTransaction (optimistic)", () => {
    it("prepends transaction and increments total", async () => {
      useTransactionsStore.setState({
        transactions: [makeTx({ id: "existing_1" })],
        total: 1,
      })

      const newTx = makeTx({ id: "new_tx", amount: -100 })
      mockCreateTransaction.mockResolvedValueOnce(newTx)

      await useTransactionsStore.getState().createTransaction({
        bookId: "book_main",
        amount: -100,
      })

      const state = useTransactionsStore.getState()
      expect(state.transactions).toHaveLength(2)
      expect(state.transactions[0].id).toBe("new_tx")
      expect(state.total).toBe(2)
    })
  })

  describe("setFilter", () => {
    it("saves the filter and fetches transactions with converted params", async () => {
      useTransactionsStore.setState({
        lastParams: { bookId: "book_main" },
      })

      mockGetTransactions.mockResolvedValueOnce({
        items: [makeTx({ id: "filtered_1" })],
        page: 1,
        pageSize: 50,
        total: 1,
      })

      await useTransactionsStore.getState().setFilter({
        period: "today",
        note: "test note",
        minValue: -100,
        maxValue: 500,
      })

      expect(useTransactionsStore.getState().currentFilter).toEqual({
        period: "today",
        note: "test note",
        minValue: -100,
        maxValue: 500,
      })

      // Should have called getTransactions with resolved params and page=1
      const callParams = mockGetTransactions.mock.calls[0][0]!!
      expect(callParams).toMatchObject({
        note: "test note",
        minValue: -100,
        maxValue: 500,
        page: 1,
      })
      // Period "today" should resolve to from/to dates
      expect(callParams.from).toBeDefined()
      expect(callParams.to).toBeDefined()
    })

    it("resolves period 'thisMonth' to from/to dates", async () => {
      mockGetTransactions.mockResolvedValueOnce({
        items: [],
        page: 1,
        pageSize: 50,
        total: 0,
      })

      await useTransactionsStore.getState().setFilter({
        period: "thisMonth",
      })

      const callParams = mockGetTransactions.mock.calls[0][0]!
      expect(callParams.from).toBeDefined()
      expect(callParams.to).toBeDefined()
      // from should be the 1st of the current month
      const fromDate = new Date(callParams.from!)
      expect(fromDate.getDate()).toBe(1)
    })

    it("maps category IDs to names", async () => {
      mockGetTransactions.mockResolvedValueOnce({
        items: [],
        page: 1,
        pageSize: 50,
        total: 0,
      })

      await useTransactionsStore.getState().setFilter({
        category: ["cat_1", "cat_2"],
      })

      const callParams = mockGetTransactions.mock.calls[0][0]!
      expect(callParams.category).toEqual(["Groceries", "Rent"])
    })

    it("maps user emails to IDs", async () => {
      mockGetTransactions.mockResolvedValueOnce({
        items: [],
        page: 1,
        pageSize: 50,
        total: 0,
      })

      await useTransactionsStore.getState().setFilter({
        user: ["john@example.com", "friend@example.com"],
      })

      const callParams = mockGetTransactions.mock.calls[0][0]!
      expect(callParams.createdBy).toEqual(["usr_1", "usr_2"])
    })

    it("resets page to 1 on filter apply", async () => {
      useTransactionsStore.setState({
        page: 5,
        lastParams: { bookId: "book_main", page: 5 },
      })

      mockGetTransactions.mockResolvedValueOnce({
        items: [makeTx()],
        page: 1,
        pageSize: 50,
        total: 1,
      })

      await useTransactionsStore.getState().setFilter({ note: "test" })

      expect(mockGetTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 }),
      )
    })
  })

  describe("clearFilter", () => {
    it("resets currentFilter to empty and fetches without filter params", async () => {
      useTransactionsStore.setState({
        currentFilter: { note: "old search" },
        lastParams: { bookId: "book_main" },
      })

      mockGetTransactions.mockResolvedValueOnce({
        items: [makeTx({ id: "cleared_1" })],
        page: 1,
        pageSize: 50,
        total: 1,
      })

      await useTransactionsStore.getState().clearFilter()

      expect(useTransactionsStore.getState().currentFilter).toEqual({})
      expect(mockGetTransactions).toHaveBeenCalledWith({
        bookId: "book_main",
      })
    })

    it("uses the override bookId when provided", async () => {
      useTransactionsStore.setState({
        currentFilter: { note: "old search" },
        lastParams: { bookId: "book_main" },
      })

      mockGetTransactions.mockResolvedValueOnce({
        items: [makeTx({ id: "switched_1" })],
        page: 1,
        pageSize: 50,
        total: 1,
      })

      await useTransactionsStore.getState().clearFilter("book_vacation")

      expect(useTransactionsStore.getState().currentFilter).toEqual({})
      expect(mockGetTransactions).toHaveBeenCalledWith({
        bookId: "book_vacation",
      })
    })
  })
})