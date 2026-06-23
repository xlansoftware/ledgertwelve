// ---------------------------------------------------------------------------
// Unit tests — OfflineTransactionsService
// ---------------------------------------------------------------------------

import { describe, expect, it, vi, beforeEach } from "vitest"
import { setupMockIdbKeyRange } from "./__tests__/db-mock"

// ---- Hoisted mock setup ----

setupMockIdbKeyRange()

const STORES = { books: "books", categories: "categories", transactions: "transactions", users: "users", sharedUsers: "sharedUsers" }
const TEST_USER_ID = "test_user_001"

let mockTxStore: any[] = []

function resetTxStore() {
  mockTxStore = []
}

function seedSampleTransactions() {
  mockTxStore = [
    {
      id: "tx_1", bookId: "book_main", userId: "u1",
      dateTime: "2026-01-10T12:00:00.000Z", amount: -50,
      categoryName: "Groceries", note: "Weekly shop", createdAt: "2026-01-10T12:00:00.000Z",
    },
    {
      id: "tx_2", bookId: "book_main", userId: "u2",
      dateTime: "2026-01-15T14:00:00.000Z", amount: -200,
      categoryName: "Rent", note: "January rent", createdAt: "2026-01-15T14:00:00.000Z",
    },
    {
      id: "tx_3", bookId: "book_main", userId: "u1",
      dateTime: "2026-02-05T10:00:00.000Z", amount: 1500,
      categoryName: "Salary", note: "February salary", createdAt: "2026-02-05T10:00:00.000Z",
    },
    {
      id: "tx_4", bookId: "book_vacation", userId: "u1",
      dateTime: "2026-03-01T08:00:00.000Z", amount: -500,
      categoryName: "Travel", note: "Flight", createdAt: "2026-03-01T08:00:00.000Z",
    },
    {
      id: "tx_5", bookId: "book_main", userId: "u1",
      dateTime: "2026-01-05T09:00:00.000Z", amount: -30,
      categoryName: "Groceries", note: "Quick stop", createdAt: "2026-01-05T09:00:00.000Z",
    },
  ]
}

// Inline mock for db
const mockDb = {
  STORES,
  async getAll<T>(): Promise<T[]> { return [...(mockTxStore as unknown as T[])] },
  async getById<T>(_storeName: string, id: string): Promise<T | undefined> {
    return mockTxStore.find((x: any) => x.id === id) as T | undefined
  },
  async put<T>(_storeName: string, value: T): Promise<void> {
    const idx = mockTxStore.findIndex((x: any) => x.id === (value as any).id)
    if (idx >= 0) mockTxStore[idx] = value
    else mockTxStore.push(value)
  },
  async remove(_storeName: string, id: string): Promise<void> {
    const idx = mockTxStore.findIndex((x: any) => x.id === id)
    if (idx >= 0) mockTxStore.splice(idx, 1)
  },
  async clearStore(): Promise<void> { resetTxStore() },
  async getAllByIndex<T>(_storeName: string, _indexName: string, value: string): Promise<T[]> {
    if (_indexName === "bookId") {
      return mockTxStore.filter((x: any) => x.bookId === value) as T[]
    }
    return mockTxStore.filter((x: any) => x[_indexName] === value) as T[]
  },
  async getAllByIndexRange<T>(_storeName: string, _indexName: string, range: any): Promise<T[]> {
    return mockTxStore.filter((x: any) => {
      if (_indexName === "bookId_dateTime") {
        return range.includes([x.bookId, x.dateTime])
      }
      return range.includes(x[_indexName])
    }) as T[]
  },
  getAllSharedUsersForBook: vi.fn().mockResolvedValue([]),
  removeSharedUser: vi.fn().mockResolvedValue(undefined),
  clearAllSharedUsersForBook: vi.fn().mockResolvedValue(undefined),
}

vi.mock("./db", () => mockDb)
vi.mock("./OfflineUserStore", () => ({
  OfflineUserStore: vi.fn().mockImplementation(() => ({
    getUserId: () => TEST_USER_ID,
    getUser: () => ({ id: TEST_USER_ID, email: "local@ledger12.app" }),
  })),
}))

const { OfflineTransactionsService } = await import("./OfflineTransactionsService")

// ---- Tests ----

describe("OfflineTransactionsService", () => {
  let service: InstanceType<typeof OfflineTransactionsService>
  const mockUserStore = { getUserId: () => TEST_USER_ID, getUser: () => ({ id: TEST_USER_ID, email: "local@ledger12.app" }) }

  beforeEach(() => {
    resetTxStore()
    service = new OfflineTransactionsService(mockUserStore as any)
  })

  // -----------------------------------------------------------------------
  // getTransactions
  // -----------------------------------------------------------------------

  describe("getTransactions", () => {
    it("returns all transactions with default pagination when no params given", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions()

      expect(result.items).toHaveLength(5)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(50)
      expect(result.total).toBe(5)
    })

    it("returns transactions sorted by dateTime descending", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions()

      const dates = result.items.map((tx: any) => tx.dateTime)
      expect(dates).toEqual([
        "2026-03-01T08:00:00.000Z",
        "2026-02-05T10:00:00.000Z",
        "2026-01-15T14:00:00.000Z",
        "2026-01-10T12:00:00.000Z",
        "2026-01-05T09:00:00.000Z",
      ])
    })

    it("filters by bookId", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions({ bookId: "book_vacation" })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe("tx_4")
    })

    it("filters by category (OR match)", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions({ category: ["Groceries"] })

      expect(result.items).toHaveLength(2)
      expect(result.items.every((tx: any) => tx.categoryName === "Groceries")).toBe(true)
    })

    it("filters by multiple categories (OR match)", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions({ category: ["Groceries", "Rent"] })

      expect(result.items).toHaveLength(3)
    })

    it("filters by createdBy (user ID, OR match)", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions({ createdBy: ["u2"] })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].userId).toBe("u2")
    })

    it("filters by note (case-insensitive substring)", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions({ note: "salary" })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].note).toBe("February salary")
    })

    it("filters by note with partial match", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions({ note: "week" })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe("tx_1")
    })

    it("filters by minValue (inclusive)", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions({ minValue: 0 })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].amount).toBe(1500)
    })

    it("filters by maxValue (inclusive)", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions({ maxValue: -100 })

      expect(result.items.length).toBeGreaterThanOrEqual(2)
      result.items.forEach((tx: any) => {
        expect(tx.amount).toBeLessThanOrEqual(-100)
      })
    })

    it("filters by both minValue and maxValue", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions({ minValue: -100, maxValue: 1000 })

      expect(result.items).toHaveLength(2)
      result.items.forEach((tx: any) => {
        expect(tx.amount).toBeGreaterThanOrEqual(-100)
        expect(tx.amount).toBeLessThanOrEqual(1000)
      })
    })

    it("applies pagination", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions({ page: 1, pageSize: 2 })

      expect(result.items).toHaveLength(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(2)
      expect(result.total).toBe(5)
    })

    it("returns second page of paginated results", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions({ page: 3, pageSize: 2 })

      expect(result.items).toHaveLength(1)
      expect(result.page).toBe(3)
      expect(result.total).toBe(5)
    })

    it("returns empty items for non-matching filters", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions({ category: ["NonExistent"] })

      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it("returns empty array when store is empty", async () => {
      const result = await service.getTransactions()
      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
    })

    it("applies combined filters (bookId + category + date range)", async () => {
      seedSampleTransactions()
      const result = await service.getTransactions({
        bookId: "book_main",
        category: ["Groceries"],
      })

      expect(result.items).toHaveLength(2)
    })
  })

  // -----------------------------------------------------------------------
  // getTransaction
  // -----------------------------------------------------------------------

  describe("getTransaction", () => {
    it("returns a transaction by id", async () => {
      seedSampleTransactions()
      const result = await service.getTransaction("tx_1")

      expect(result.id).toBe("tx_1")
      expect(result.amount).toBe(-50)
    })

    it("throws when transaction not found", async () => {
      await expect(service.getTransaction("invalid")).rejects.toThrow(
        "Transaction not found",
      )
    })
  })

  // -----------------------------------------------------------------------
  // createTransaction
  // -----------------------------------------------------------------------

  describe("createTransaction", () => {
    it("creates a simple transaction with auto-generated fields", async () => {
      const result = await service.createTransaction({
        bookId: "book_main",
        amount: -75,
        categoryName: "Dining Out",
        note: "Lunch",
      })

      expect(result).toMatchObject({
        bookId: "book_main",
        userId: TEST_USER_ID,
        amount: -75,
        categoryName: "Dining Out",
        note: "Lunch",
      })
      expect(result.id).toBeTruthy()
      expect(result.dateTime).toBeTruthy()
      expect(result.createdAt).toBeTruthy()
    })

    it("accepts an explicit dateTime", async () => {
      const result = await service.createTransaction({
        bookId: "book_main",
        amount: -10,
        dateTime: "2026-06-01T00:00:00.000Z",
      })

      expect(result.dateTime).toBe("2026-06-01T00:00:00.000Z")
    })

    it("creates a multi-currency transaction", async () => {
      const result = await service.createTransaction({
        bookId: "book_main",
        amount: -91,
        originalCurrency: "USD",
        originalAmount: -100,
        exchangeRate: 0.91,
      })

      expect(result.originalCurrency).toBe("USD")
      expect(result.originalAmount).toBe(-100)
      expect(result.exchangeRate).toBe(0.91)
    })

    it("throws when originalCurrency is set but originalAmount is missing", async () => {
      await expect(
        service.createTransaction({
          bookId: "book_main",
          amount: -91,
          originalCurrency: "USD",
          exchangeRate: 0.91,
        }),
      ).rejects.toThrow("originalAmount and exchangeRate are required")
    })

    it("throws when originalCurrency is set but exchangeRate is missing", async () => {
      await expect(
        service.createTransaction({
          bookId: "book_main",
          amount: -91,
          originalCurrency: "USD",
          originalAmount: -100,
        }),
      ).rejects.toThrow("originalAmount and exchangeRate are required")
    })

    it("persists the transaction in the database", async () => {
      const created = await service.createTransaction({
        bookId: "book_main",
        amount: -25,
      })

      const stored = mockTxStore.find((tx: any) => tx.id === created.id)
      expect(stored).toBeDefined()
      expect(stored.amount).toBe(-25)
    })
  })

  // -----------------------------------------------------------------------
  // updateTransaction
  // -----------------------------------------------------------------------

  describe("updateTransaction", () => {
    let txId: string

    beforeEach(async () => {
      const tx = await service.createTransaction({
        bookId: "book_main",
        amount: -50,
        categoryName: "Groceries",
        note: "Original note",
      })
      txId = tx.id
    })

    it("updates specified fields", async () => {
      const result = await service.updateTransaction(txId, {
        amount: -100,
        note: "Updated note",
      })

      expect(result.amount).toBe(-100)
      expect(result.note).toBe("Updated note")
      expect(result.categoryName).toBe("Groceries")
      expect(result.bookId).toBe("book_main")
    })

    it("changes category", async () => {
      const result = await service.updateTransaction(txId, {
        categoryName: "Dining",
      })

      expect(result.categoryName).toBe("Dining")
    })

    it("throws on non-existent transaction", async () => {
      await expect(
        service.updateTransaction("invalid", { amount: 0 }),
      ).rejects.toThrow("Transaction not found")
    })

    it("re-validates multi-currency consistency after update", async () => {
      await expect(
        service.updateTransaction(txId, {
          originalCurrency: "USD",
        }),
      ).rejects.toThrow("originalAmount and exchangeRate are required")
    })

    it("validates multi-currency when all fields are set together", async () => {
      const result = await service.updateTransaction(txId, {
        originalCurrency: "USD",
        originalAmount: -110,
        exchangeRate: 0.91,
      })

      expect(result.originalCurrency).toBe("USD")
      expect(result.originalAmount).toBe(-110)
      expect(result.exchangeRate).toBe(0.91)
    })
  })

  // -----------------------------------------------------------------------
  // deleteTransaction
  // -----------------------------------------------------------------------

  describe("deleteTransaction", () => {
    it("deletes an existing transaction", async () => {
      const tx = await service.createTransaction({
        bookId: "book_main",
        amount: -10,
      })

      await expect(service.deleteTransaction(tx.id)).resolves.toBeUndefined()
      const stored = mockTxStore.find((t: any) => t.id === tx.id)
      expect(stored).toBeUndefined()
    })

    it("throws on non-existent transaction", async () => {
      await expect(service.deleteTransaction("invalid")).rejects.toThrow(
        "Transaction not found",
      )
    })
  })
})