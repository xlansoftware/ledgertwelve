// ---------------------------------------------------------------------------
// Unit tests — OfflineReportsService
// ---------------------------------------------------------------------------

import { describe, expect, it, vi, beforeEach } from "vitest"
import { setupMockIdbKeyRange } from "./__tests__/db-mock"

// ---- Hoisted mock setup ----

setupMockIdbKeyRange()

const STORES = { books: "books", categories: "categories", transactions: "transactions", users: "users", sharedUsers: "sharedUsers" }

let mockDbState: Record<string, any[]> = {}

function resetDb() {
  mockDbState = { books: [], categories: [], transactions: [], users: [], sharedUsers: [] }
}
resetDb()

const mockDb = {
  STORES,
  async getAll<T>(storeName: string): Promise<T[]> {
    return [...(mockDbState[storeName] as unknown as T[])]
  },
  async getById<T>(storeName: string, id: string): Promise<T | undefined> {
    const items = mockDbState[storeName] as any[]
    return items.find((x: any) => x.id === id) as T | undefined
  },
  async put<T>(storeName: string, value: T): Promise<void> {
    const items = mockDbState[storeName] as any[]
    const idx = items.findIndex((x: any) => x.id === (value as any).id)
    if (idx >= 0) items[idx] = value
    else items.push(value)
  },
  async getAllByIndex<T>(_storeName: string, _indexName: string, value: string): Promise<T[]> {
    const items = mockDbState.transactions as any[]
    if (_indexName === "bookId") {
      return items.filter((x: any) => x.bookId === value) as T[]
    }
    return items.filter((x: any) => x[_indexName] === value) as T[]
  },
  getAllByIndexRange: vi.fn().mockResolvedValue([]),
  getAllSharedUsersForBook: vi.fn().mockResolvedValue([]),
  removeSharedUser: vi.fn().mockResolvedValue(undefined),
  clearAllSharedUsersForBook: vi.fn().mockResolvedValue(undefined),
  clearStore: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
}

vi.mock("./db", () => mockDb)

const { OfflineReportsService } = await import("./OfflineReportsService")

// ---- Helpers ----

const MAIN_BOOK = {
  id: "book_main",
  name: "Main",
  currency: "EUR",
  status: "open" as const,
  ownerId: "u1",
  sharedWith: [],
  createdAt: "2026-01-01T00:00:00.000Z",
}

function seedMainBook() {
  mockDbState.books = [MAIN_BOOK]
}

function seedTransactions() {
  mockDbState.transactions = [
    {
      id: "tx_1", bookId: "book_main", userId: "u1",
      dateTime: "2026-01-05T10:00:00.000Z", amount: -50,
      categoryName: "Groceries", createdAt: "2026-01-05T10:00:00.000Z",
    },
    {
      id: "tx_2", bookId: "book_main", userId: "u1",
      dateTime: "2026-01-15T14:00:00.000Z", amount: -200,
      categoryName: "Rent", createdAt: "2026-01-15T14:00:00.000Z",
    },
    {
      id: "tx_3", bookId: "book_main", userId: "u1",
      dateTime: "2026-01-20T09:00:00.000Z", amount: 1500,
      categoryName: "Salary", createdAt: "2026-01-20T09:00:00.000Z",
    },
    {
      id: "tx_4", bookId: "book_main", userId: "u1",
      dateTime: "2026-02-10T12:00:00.000Z", amount: -80,
      categoryName: "Groceries", createdAt: "2026-02-10T12:00:00.000Z",
    },
    {
      id: "tx_5", bookId: "book_main", userId: "u1",
      dateTime: "2026-03-05T08:00:00.000Z", amount: -120,
      categoryName: "Utilities", createdAt: "2026-03-05T08:00:00.000Z",
    },
    {
      id: "tx_6", bookId: "book_main", userId: "u1",
      dateTime: "2026-03-31T23:59:00.000Z", amount: 500,
      categoryName: "Transfers",
      isBookClosingEntry: true,
      closedBookId: "book_vacation",
      createdAt: "2026-03-31T23:59:00.000Z",
    },
  ]
}

describe("OfflineReportsService", () => {
  let service: InstanceType<typeof OfflineReportsService>

  beforeEach(() => {
    resetDb()
    service = new OfflineReportsService()
  })

  // -----------------------------------------------------------------------
  // getTotals
  // -----------------------------------------------------------------------

  describe("getTotals", () => {
    it("throws when Main book does not exist", async () => {
      await expect(service.getTotals()).rejects.toThrow("Main book not found")
    })

    it("returns totals grouped by month by default", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getTotals()

      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({ period: "2026-01", income: 1500, expense: -250, net: 1250 })
      expect(result[1]).toMatchObject({ period: "2026-02", income: 0, expense: -80, net: -80 })
      expect(result[2]).toMatchObject({ period: "2026-03", income: 0, expense: -120, net: -120 })
    })

    it("groups by day when period=day", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getTotals({ period: "day" })

      expect(result).toHaveLength(5)
      expect(result[0].period).toBe("2026-01-05")
      expect(result[1].period).toBe("2026-01-15")
    })

    it("groups by year when period=year", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getTotals({ period: "year" })

      expect(result).toHaveLength(1)
      expect(result[0].period).toBe("2026")
    })

    it("groups by ISO week when period=week", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getTotals({ period: "week" })

      expect(result.length).toBeGreaterThanOrEqual(4)
    })

    it("filters by date range", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getTotals({
        from: "2026-02-01",
        to: "2026-03-01",
      })

      expect(result).toHaveLength(1)
      expect(result[0].period).toBe("2026-02")
    })

    it("sorts results by period ascending", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getTotals()

      expect(result.map((r: any) => r.period)).toEqual(["2026-01", "2026-02", "2026-03"])
    })

    it("returns empty array when no transactions in range", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getTotals({
        from: "2027-01-01",
        to: "2027-02-01",
      })

      expect(result).toEqual([])
    })
  })

  // -----------------------------------------------------------------------
  // getCategoryReport
  // -----------------------------------------------------------------------

  describe("getCategoryReport", () => {
    it("returns amounts grouped by category", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getCategoryReport()

      expect(result).toEqual(
        expect.arrayContaining([
          { categoryName: "Groceries", amount: -130 },
          { categoryName: "Rent", amount: -200 },
          { categoryName: "Salary", amount: 1500 },
          { categoryName: "Utilities", amount: -120 },
        ]),
      )
    })

    it("assigns Uncategorized for transactions without categoryName", async () => {
      seedMainBook()
      mockDbState.transactions = [
        { id: "tx_uncat", bookId: "book_main", userId: "u1", dateTime: "2026-04-01T00:00:00.000Z", amount: -42, createdAt: "2026-04-01T00:00:00.000Z" },
      ]

      const result = await service.getCategoryReport()
      const uncategorized = result.find((r: any) => r.categoryName === "Uncategorized")
      expect(uncategorized).toBeDefined()
      expect(uncategorized!.amount).toBe(-42)
    })

    it("excludes closing entries", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getCategoryReport()

      expect(result.find((r: any) => r.categoryName === "Transfers")).toBeUndefined()
    })

    it("respects date range filter", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getCategoryReport({
        from: "2026-02-01",
        to: "2026-03-01",
      })

      expect(result).toHaveLength(1)
      expect(result[0].categoryName).toBe("Groceries")
    })
  })

  // -----------------------------------------------------------------------
  // getDailyReport
  // -----------------------------------------------------------------------

  describe("getDailyReport", () => {
    it("throws when from is missing", async () => {
      await expect(
        (service as any).getDailyReport({ to: "2026-02-01" }),
      ).rejects.toThrow("from and to query parameters are required")
    })

    it("throws when to is missing", async () => {
      await expect(
        (service as any).getDailyReport({ from: "2026-01-01" }),
      ).rejects.toThrow("from and to query parameters are required")
    })

    it("returns daily totals within the date range", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getDailyReport({
        from: "2026-01-01",
        to: "2026-02-01",
      })

      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({ date: "2026-01-05", amount: -50 })
      expect(result[1]).toMatchObject({ date: "2026-01-15", amount: -200 })
      expect(result[2]).toMatchObject({ date: "2026-01-20", amount: 1500 })
    })

    it("excludes closing entries", async () => {
      seedMainBook()
      seedTransactions()

      const result = await service.getDailyReport({
        from: "2026-03-01",
        to: "2026-04-01",
      })

      expect(result.find((r: any) => r.date === "2026-03-31")).toBeUndefined()
      expect(result).toHaveLength(1) // Only Mar 5
    })
  })

  // -----------------------------------------------------------------------
  // getMonthlyReport
  // -----------------------------------------------------------------------

  describe("getMonthlyReport", () => {
    it("throws when from is missing", async () => {
      await expect(
        (service as any).getMonthlyReport({ to: "2026-03-01" }),
      ).rejects.toThrow("from and to query parameters are required")
    })

    it("returns monthly totals", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getMonthlyReport({
        from: "2026-01-01",
        to: "2026-04-01",
      })

      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({ period: "2026-01", amount: 1250 })
      expect(result[1]).toMatchObject({ period: "2026-02", amount: -80 })
      expect(result[2]).toMatchObject({ period: "2026-03", amount: -120 })
    })

    it("sorts by period ascending", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getMonthlyReport({
        from: "2026-01-01",
        to: "2026-04-01",
      })

      expect(result.map((r: any) => r.period)).toEqual(["2026-01", "2026-02", "2026-03"])
    })
  })

  // -----------------------------------------------------------------------
  // getDailyAverage
  // -----------------------------------------------------------------------

  describe("getDailyAverage", () => {
    it("throws when from is missing", async () => {
      await expect(
        service.getDailyAverage({ from: "", to: "2026-02-01" } as any),
      ).rejects.toThrow("from and to query parameters are required")
    })

    it("returns average and count for the date range", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getDailyAverage({
        from: "2026-01-01",
        to: "2026-02-01",
      })

      expect(result).toMatchObject({ average: 416.67, count: 3 })
    })

    it("returns zero average when no transactions in range", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getDailyAverage({
        from: "2027-01-01",
        to: "2027-02-01",
      })

      expect(result).toEqual({ average: 0, count: 0 })
    })
  })

  // -----------------------------------------------------------------------
  // getMonthlyAverage
  // -----------------------------------------------------------------------

  describe("getMonthlyAverage", () => {
    it("returns average and count for the date range", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getMonthlyAverage({
        from: "2026-01-01",
        to: "2026-04-01",
      })

      expect(result).toMatchObject({ average: 350, count: 3 })
    })

    it("returns zero average when no transactions in range", async () => {
      seedMainBook()
      seedTransactions()
      const result = await service.getMonthlyAverage({
        from: "2027-01-01",
        to: "2027-04-01",
      })

      expect(result).toEqual({ average: 0, count: 0 })
    })
  })
})