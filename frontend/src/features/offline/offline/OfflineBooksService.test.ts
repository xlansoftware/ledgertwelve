// ---------------------------------------------------------------------------
// Unit tests — OfflineBooksService
// ---------------------------------------------------------------------------

import type { BookDto, TransactionDto } from "@/types"
import type { SharedUserEntry } from "./db"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { setupMockIdbKeyRange } from "./__tests__/db-mock"

// ---- Hoisted mock setup ----

setupMockIdbKeyRange()

const STORES = { books: "books", categories: "categories", transactions: "transactions", users: "users", sharedUsers: "sharedUsers" }
const TEST_USER_ID = "test_user_001"

// In-memory stores for db mock
let mockBooks: BookDto[] = []
let mockTransactions: TransactionDto[] = []
let mockSharedUsers: SharedUserEntry[] = []

function resetAllStores() {
  mockBooks = []
  mockTransactions = []
  mockSharedUsers = []
}
resetAllStores()

const mockCreateTransaction = vi.fn()

// Inline mock for db
const mockDb = {
  STORES,
  async getAll<T>(storeName: string): Promise<T[]> {
    if (storeName === "books") return [...(mockBooks as unknown as T[])]
    if (storeName === "transactions") return [...(mockTransactions as unknown as T[])]
    if (storeName === "sharedUsers") return [...(mockSharedUsers as unknown as T[])]
    return []
  },
  async getById<T>(storeName: string, id: string): Promise<T | undefined> {
    if (storeName === "sharedUsers") {
      // Compound key format: bookId\x00userId
      const [bookId, userId] = id.split("\x00")
      return mockSharedUsers.find((x) => x.bookId === bookId && x.userId === userId) as T | undefined
    }
    const items = storeName === "books" ? mockBooks : storeName === "transactions" ? mockTransactions : []
    return items.find((x) => x.id === id) as T | undefined
  },
  async put<T>(storeName: string, value: T): Promise<void> {
    const items = storeName === "books" ? mockBooks : storeName === "transactions" ? mockTransactions : storeName === "sharedUsers" ? mockSharedUsers : ([] as unknown[])
    const valueWithId = value as unknown as { id: string }
    const idx = (items as unknown as { id: string }[]).findIndex((x) => x.id === valueWithId.id)
    if (idx >= 0) (items as unknown[])[idx] = value as unknown
    else (items as unknown[]).push(value as unknown)
  },
  async remove(storeName: string, id: string): Promise<void> {
    const items = storeName === "books" ? mockBooks : storeName === "transactions" ? mockTransactions : []
    const idx = items.findIndex((x) => x.id === id)
    if (idx >= 0) items.splice(idx, 1)
  },
  async getAllByIndex<T>(_storeName: string, _indexName: string, value: string): Promise<T[]> {
    if (_indexName === "bookId") {
      return mockTransactions.filter((x) => x.bookId === value) as unknown as T[]
    }
    return []
  },
  getAllByIndexRange: vi.fn().mockResolvedValue([]),
  async getAllSharedUsersForBook(bookId: string): Promise<SharedUserEntry[]> {
    return mockSharedUsers.filter((e) => e.bookId === bookId)
  },
  async removeSharedUser(bookId: string, userId: string): Promise<void> {
    const idx = mockSharedUsers.findIndex((e) => e.bookId === bookId && e.userId === userId)
    if (idx >= 0) mockSharedUsers.splice(idx, 1)
  },
  async clearAllSharedUsersForBook(bookId: string): Promise<void> {
    mockSharedUsers = mockSharedUsers.filter((e) => e.bookId !== bookId)
  },
  clearStore: vi.fn().mockResolvedValue(undefined),
}

vi.mock("./db", () => mockDb)
vi.mock("./OfflineUserStore", () => ({
  OfflineUserStore: vi.fn().mockImplementation(() => ({
    getUserId: () => TEST_USER_ID,
    getUser: () => ({ id: TEST_USER_ID, email: "local@ledger12.app" }),
  })),
}))
vi.mock("@/features/offline/factory", () => ({
  getFactory: vi.fn(() => ({
    transactions: {
      createTransaction: mockCreateTransaction,
    },
  })),
}))

const { OfflineBooksService } = await import("./OfflineBooksService")

// ---- Helpers ----

function seedBooksWithMain() {
  mockBooks = [
    { id: "book_main", name: "Main", currency: "EUR", status: "open", ownerId: TEST_USER_ID, sharedWith: [], createdAt: "2026-01-01T00:00:00.000Z" },
  ]
}

function seedSecondaryBook() {
  mockBooks = [
    { id: "book_main", name: "Main", currency: "EUR", status: "open", ownerId: TEST_USER_ID, sharedWith: [], createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "book_vacation", name: "Vacation 2026", currency: "USD", status: "open", ownerId: TEST_USER_ID, sharedWith: [], createdAt: "2026-01-15T00:00:00.000Z" },
  ]
}

// ---- Tests ----

describe("OfflineBooksService", () => {
  const mockUserStore: { getUserId: () => string; getUser: () => { id: string; email: string } } = {
    getUserId: () => TEST_USER_ID,
    getUser: () => ({ id: TEST_USER_ID, email: "local@ledger12.app" }),
  }
  let service: InstanceType<typeof OfflineBooksService>

  beforeEach(() => {
    resetAllStores()
    vi.clearAllMocks()
    service = new OfflineBooksService(mockUserStore as any)
  })

  // -----------------------------------------------------------------------
  // getBooks
  // -----------------------------------------------------------------------

  describe("getBooks", () => {
    it("returns all books", async () => {
      seedBooksWithMain()
      const result = await service.getBooks()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe("Main")
    })

    it("returns multiple books", async () => {
      seedSecondaryBook()
      const result = await service.getBooks()

      expect(result).toHaveLength(2)
      expect(result.map((b) => b.name)).toContain("Main")
      expect(result.map((b) => b.name)).toContain("Vacation 2026")
    })

    it("returns an empty array when no books exist", async () => {
      const result = await service.getBooks()
      expect(result).toEqual([])
    })
  })

  // -----------------------------------------------------------------------
  // getBook
  // -----------------------------------------------------------------------

  describe("getBook", () => {
    it("returns a book by id with sharedWith hydrated", async () => {
      seedBooksWithMain()
      mockSharedUsers.push({ bookId: "book_main", userId: "usr_shared_1", email: "friend@example.com", permission: "edit" })

      const result = await service.getBook("book_main")

      expect(result.name).toBe("Main")
      expect(result.sharedWith).toEqual([{ userId: "usr_shared_1", email: "friend@example.com", permission: "edit" }])
    })

    it("throws on non-existent book", async () => {
      await expect(service.getBook("invalid")).rejects.toThrow("Book not found")
    })
  })

  // -----------------------------------------------------------------------
  // createBook
  // -----------------------------------------------------------------------

  describe("createBook", () => {
    it("creates a book with the given name", async () => {
      const result = await service.createBook({ name: "Test Book" })

      expect(result).toMatchObject({ name: "Test Book", status: "open", ownerId: TEST_USER_ID, sharedWith: [] })
      expect(result.id).toBeTruthy()
      expect(result.createdAt).toBeTruthy()
    })

    it("accepts an optional currency", async () => {
      const result = await service.createBook({ name: "USD Book", currency: "USD" })
      expect(result.currency).toBe("USD")
    })

    it("persists the book in the database", async () => {
      const created = await service.createBook({ name: "Persisted" })
      const stored = mockBooks.find((b) => b.id === created.id)
      expect(stored).toBeDefined()
      expect(stored?.name).toBe("Persisted")
    })
  })

  // -----------------------------------------------------------------------
  // updateBook
  // -----------------------------------------------------------------------

  describe("updateBook", () => {
    it("updates book name and currency", async () => {
      seedBooksWithMain()
      const result = await service.updateBook("book_main", { name: "Updated Main", currency: "USD" })

      expect(result.name).toBe("Updated Main")
      expect(result.currency).toBe("USD")
    })

    it("throws on non-existent book", async () => {
      await expect(service.updateBook("invalid", { name: "Nope" })).rejects.toThrow("Book not found")
    })
  })

  // -----------------------------------------------------------------------
  // deleteBook
  // -----------------------------------------------------------------------

  describe("deleteBook", () => {
    it("throws when deleting the Main book", async () => {
      seedBooksWithMain()
      await expect(service.deleteBook("book_main")).rejects.toThrow("Cannot delete Main book")
    })

    it("throws when deleting a book with transactions", async () => {
      seedSecondaryBook()
      mockTransactions.push({ id: "tx_1", bookId: "book_vacation", userId: "u1", amount: -50, dateTime: "2026-02-01T00:00:00.000Z", createdAt: "2026-02-01T00:00:00.000Z" })

      await expect(service.deleteBook("book_vacation")).rejects.toThrow("Cannot delete book with existing transactions")
    })

    it("deletes an empty secondary book and cleans up shared users", async () => {
      seedSecondaryBook()
      mockSharedUsers.push({ bookId: "book_vacation", userId: "usr_s", email: "s@example.com", permission: "view" })

      await expect(service.deleteBook("book_vacation")).resolves.toBeUndefined()
      expect(mockBooks.find((b) => b.id === "book_vacation")).toBeUndefined()
      expect(mockSharedUsers.filter((s) => s.bookId === "book_vacation")).toHaveLength(0)
    })

    it("throws when book not found", async () => {
      await expect(service.deleteBook("invalid")).rejects.toThrow("Book not found")
    })
  })

  // -----------------------------------------------------------------------
  // Sharing
  // -----------------------------------------------------------------------

  describe("addShare", () => {
    it("adds a share with edit permission", async () => {
      seedBooksWithMain()
      const result = await service.addShare("book_main", { email: "friend@example.com", permission: "edit" })

      expect(result).toMatchObject({ userId: expect.any(String), permission: "edit" })
    })

    it("persists the share in sharedUsers store", async () => {
      seedBooksWithMain()
      const result = await service.addShare("book_main", { email: "friend@example.com", permission: "view" })

      expect(mockSharedUsers).toHaveLength(1)
      expect(mockSharedUsers[0].email).toBe("friend@example.com")
      expect(mockSharedUsers[0].userId).toBe(result.userId)
    })

    it("throws when book does not exist", async () => {
      await expect(service.addShare("invalid", { email: "f@example.com", permission: "view" })).rejects.toThrow("Book not found")
    })
  })

  describe("updateShare", () => {
    it("updates share permission", async () => {
      seedBooksWithMain()
      const added = await service.addShare("book_main", { email: "friend@example.com", permission: "edit" })

      const result = await service.updateShare("book_main", added.userId, { permission: "view" })

      expect(result.permission).toBe("view")
    })

    it("throws when share not found", async () => {
      seedBooksWithMain()
      await expect(service.updateShare("book_main", "nonexistent", { permission: "view" })).rejects.toThrow("Share not found")
    })
  })

  describe("removeShare", () => {
    it("removes a share", async () => {
      seedBooksWithMain()
      const added = await service.addShare("book_main", { email: "friend@example.com", permission: "edit" })

      await expect(service.removeShare("book_main", added.userId)).resolves.toBeUndefined()
      expect(mockSharedUsers).toHaveLength(0)
    })

    it("throws when share not found", async () => {
      seedBooksWithMain()
      await expect(service.removeShare("book_main", "nonexistent")).rejects.toThrow("Share not found")
    })
  })

  // -----------------------------------------------------------------------
  // getCurrentBook / setCurrentBook
  // -----------------------------------------------------------------------

  describe("getCurrentBook", () => {
    it("returns the first book when there are no selections", async () => {
      seedBooksWithMain()
      const result = await service.getCurrentBook()
      expect(result.name).toBe("Main")
    })

    it("throws when no books exist", async () => {
      await expect(service.getCurrentBook()).rejects.toThrow("No books found")
    })
  })

  describe("setCurrentBook", () => {
    it("returns the book for the given id", async () => {
      seedBooksWithMain()
      const result = await service.setCurrentBook("book_main")
      expect(result.name).toBe("Main")
    })

    it("throws when book not found", async () => {
      await expect(service.setCurrentBook("invalid")).rejects.toThrow("Book not found")
    })
  })

  // -----------------------------------------------------------------------
  // getBookStats
  // -----------------------------------------------------------------------

  describe("getBookStats", () => {
    it("returns transactionCount and totalSum for a book", async () => {
      seedSecondaryBook()
      mockTransactions = [
        { id: "tx_1", bookId: "book_vacation", userId: "u1", amount: -100, dateTime: "2026-02-01T00:00:00.000Z", createdAt: "2026-02-01T00:00:00.000Z" },
        { id: "tx_2", bookId: "book_vacation", userId: "u1", amount: 50, dateTime: "2026-02-15T00:00:00.000Z", createdAt: "2026-02-15T00:00:00.000Z" },
      ]

      const stats = await service.getBookStats("book_vacation")
      expect(stats).toEqual({ transactionCount: 2, totalSum: -50 })
    })

    it("excludes closing entries from stats", async () => {
      seedSecondaryBook()
      mockTransactions = [
        { id: "tx_1", bookId: "book_vacation", userId: "u1", amount: -100, dateTime: "2026-02-01T00:00:00.000Z", createdAt: "2026-02-01T00:00:00.000Z" },
        { id: "tx_2", bookId: "book_vacation", userId: "u1", amount: 500, isBookClosingEntry: true, closedBookId: "other", dateTime: "2026-02-28T00:00:00.000Z", createdAt: "2026-02-28T00:00:00.000Z" },
      ]

      const stats = await service.getBookStats("book_vacation")
      expect(stats).toEqual({ transactionCount: 1, totalSum: -100 })
    })

    it("filters by asOf date (end-of-day inclusive semantics)", async () => {
      seedSecondaryBook()
      mockTransactions = [
        { id: "tx_1", bookId: "book_vacation", userId: "u1", amount: -100, dateTime: "2026-02-01T10:00:00.000Z", createdAt: "2026-02-01T10:00:00.000Z" },
        { id: "tx_2", bookId: "book_vacation", userId: "u1", amount: -200, dateTime: "2026-02-15T10:00:00.000Z", createdAt: "2026-02-15T10:00:00.000Z" },
      ]

      const stats = await service.getBookStats("book_vacation", { asOf: "2026-02-10" })
      expect(stats).toEqual({ transactionCount: 1, totalSum: -100 })
    })

    it("returns zero stats for a book with no transactions", async () => {
      seedSecondaryBook()
      const stats = await service.getBookStats("book_vacation")
      expect(stats).toEqual({ transactionCount: 0, totalSum: 0 })
    })

    it("throws on non-existent book", async () => {
      await expect(service.getBookStats("invalid")).rejects.toThrow("Book not found")
    })
  })

  // -----------------------------------------------------------------------
  // closeBook / reopenBook
  // -----------------------------------------------------------------------

  describe("closeBook", () => {
    it("closes a book and creates a balancing transaction", async () => {
      seedSecondaryBook()
      mockTransactions = [
        { id: "tx_1", bookId: "book_vacation", userId: "u1", amount: -300, dateTime: "2026-02-01T00:00:00.000Z", createdAt: "2026-02-01T00:00:00.000Z" },
        { id: "tx_2", bookId: "book_vacation", userId: "u1", amount: 100, dateTime: "2026-02-15T00:00:00.000Z", createdAt: "2026-02-15T00:00:00.000Z" },
      ]
      mockCreateTransaction.mockResolvedValueOnce({ id: "closing_tx_1", bookId: "book_main", amount: -200 })

      const result = await service.closeBook("book_vacation", { closingCategoryName: "Transfers" })

      expect(result).toMatchObject({ bookId: "book_vacation", status: "closed", closingTransactionId: "closing_tx_1", netBalance: -200 })
      expect(mockCreateTransaction).toHaveBeenCalledWith({
        bookId: "book_main",
        amount: -200,
        dateTime: expect.any(String),
        categoryName: "Transfers",
        note: "Close Vacation 2026",
      })

      const book = mockBooks.find((b) => b.id === "book_vacation")
      expect(book?.status).toBe("closed")
      expect(book?.closedAt).toBeTruthy()
    })

    it("throws when book is already closed", async () => {
      seedSecondaryBook()
      const book = mockBooks.find((b) => b.id === "book_vacation")
      book!.status = "closed"
      book!.closedAt = "2026-03-01T00:00:00.000Z"

      await expect(service.closeBook("book_vacation", { closingCategoryName: "Transfers" })).rejects.toThrow("Book already closed")
    })

    it("throws when closing the Main book", async () => {
      seedBooksWithMain()
      await expect(service.closeBook("book_main", { closingCategoryName: "Transfers" })).rejects.toThrow("Cannot close Main book")
    })

    it("throws when book not found", async () => {
      await expect(service.closeBook("nonexistent", { closingCategoryName: "Transfers" })).rejects.toThrow("Book not found")
    })
  })

  describe("reopenBook", () => {
    it("reopens a closed book", async () => {
      seedSecondaryBook()
      mockCreateTransaction.mockResolvedValueOnce({ id: "closing_tx", bookId: "book_main", amount: 0 })
      await service.closeBook("book_vacation", { closingCategoryName: "Transfers" })

      const result = await service.reopenBook("book_vacation")

      expect(result).toMatchObject({ bookId: "book_vacation", status: "open" })
      const book = mockBooks.find((b) => b.id === "book_vacation")
      expect(book?.status).toBe("open")
      expect(book?.closedAt).toBeUndefined()
    })

    it("throws when reopening a non-closed book", async () => {
      seedSecondaryBook()
      await expect(service.reopenBook("book_vacation")).rejects.toThrow("Book is not closed")
    })

    it("throws when book not found", async () => {
      await expect(service.reopenBook("invalid")).rejects.toThrow("Book not found")
    })
  })
})