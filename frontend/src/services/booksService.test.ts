// ---------------------------------------------------------------------------
// Unit tests — booksService
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"
import {
  getBooks,
  getBook,
  getCurrentBook,
  setCurrentBook,
  createBook,
  updateBook,
  deleteBook,
  addShare,
  updateShare,
  removeShare,
  closeBook,
  reopenBook,
  addGlobalShare,
  removeGlobalShare,
} from "./booksService"
import { createTransaction } from "./transactionsService"
import { login } from "./authService"
import { getBookStats } from "./booksService"

describe("booksService", () => {
  beforeAll(async () => {
    await login({ email: "john@example.com", password: "secret-password" })
  })

  describe("getBooks", () => {
    it("returns visible books for the authenticated user", async () => {
      const result = await getBooks()
      expect(result.length).toBeGreaterThanOrEqual(2)
      const names = result.map((b) => b.name)
      expect(names).toContain("Main")
      expect(names).toContain("Vacation 2026")
    })

    it("returns books with expected shape", async () => {
      const result = await getBooks()
      const book = result[0]
      expect(book).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        status: expect.any(String),
        ownerId: expect.any(String),
      })
    })
  })

  describe("getBookStats", () => {
    it("returns transactionCount and totalSum for a valid book", async () => {
      const stats = await getBookStats("book_main")
      expect(stats).toMatchObject({
        transactionCount: expect.any(Number),
        totalSum: expect.any(Number),
      })
      expect(stats.transactionCount).toBeGreaterThan(0)
    })

    it("returns zero stats for a book with no transactions", async () => {
      const { createBook } = await import("./booksService")
      const book = await createBook({ name: "Empty Book" })
      const stats = await getBookStats(book.id)
      expect(stats).toEqual({ transactionCount: 0, totalSum: 0 })
    })

    it("throws on non-existent book", async () => {
      await expect(getBookStats("book_invalid")).rejects.toThrow(
        /Book not found/i,
      )
    })

    it("returns different (smaller) totalSum when asOf is in the past", async () => {
      // Full book stats
      const fullStats = await getBookStats("book_main")
      expect(fullStats.transactionCount).toBeGreaterThan(0)

      // Stats as of a date far in the past (should only include early transactions)
      const pastStats = await getBookStats("book_main", { asOf: "2026-01-15" })

      // The asOf-filtered stats should have fewer or equal transactions
      expect(pastStats.transactionCount).toBeLessThanOrEqual(fullStats.transactionCount)
      // When asOf is early, the sum should be different (smaller magnitude)
      expect(pastStats.totalSum).not.toBe(fullStats.totalSum)
    })
  })

    describe("getCurrentBook", () => {
    it("returns the current book for the authenticated user", async () => {
      const result = await getCurrentBook()
      expect(result).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        status: expect.any(String),
      })
    })

    it("returns the first visible book when no selection was persisted", async () => {
      // The mock returns the first book ordered by creation date when no selection exists
      const result = await getCurrentBook()
      expect(result.name).toBe("Main")
    })

    it("returns the persisted selection after setCurrentBook is called", async () => {
      // First, pick a different book
      const selected = await setCurrentBook("book_vacation")
      expect(selected.name).toBe("Vacation 2026")
      // Then verify GET returns the persisted selection
      const current = await getCurrentBook()
      expect(current.id).toBe("book_vacation")
      // Reset back to Main for other tests
      await setCurrentBook("book_main")
    })

    it("throws 401 on unauthenticated request", async () => {
      const { clearAuth, seedSession } = await import("@/mocks/handlers")
      clearAuth()

      await expect(getCurrentBook()).rejects.toThrow(/Unauthorized/i)

      // Restore session
      seedSession("usr_1")
    })
  })

  describe("setCurrentBook", () => {
    it("sends bookId and returns the selected book DTO", async () => {
      const result = await setCurrentBook("book_vacation")
      expect(result).toMatchObject({
        id: "book_vacation",
        name: "Vacation 2026",
        status: "open",
      })
      // Reset
      await setCurrentBook("book_main")
    })

    it("throws 404 for invalid or non-visible bookId", async () => {
      await expect(setCurrentBook("book_invalid")).rejects.toThrow(
        /Book not found/i,
      )
    })

    it("throws 400 when bookId is missing", async () => {
      await expect(setCurrentBook("")).rejects.toThrow(/bookId/i)
    })
  })

  describe("getBook", () => {
    it("returns a single book by id", async () => {
      const result = await getBook("book_main")
      expect(result.name).toBe("Main")
      expect(result.status).toBe("open")
    })

    it("throws on non-existent book", async () => {
      await expect(getBook("book_invalid")).rejects.toThrow(/Book not found/i)
    })
  })

  describe("createBook", () => {
    it("creates a new book", async () => {
      const result = await createBook({ name: "Test Book", currency: "USD" })
      expect(result).toMatchObject({
        name: "Test Book",
        currency: "USD",
        status: "open",
      })
      expect(result.id).toMatch(/^book_/)
    })

    it("creates a book without currency", async () => {
      const result = await createBook({ name: "No Currency" })
      expect(result.name).toBe("No Currency")
    })
  })

  describe("updateBook", () => {
    it("updates book name and currency", async () => {
      const result = await updateBook("book_vacation", {
        name: "Vacation Spain",
        currency: "USD",
      })
      expect(result.name).toBe("Vacation Spain")
      expect(result.currency).toBe("USD")
    })
  })

  describe("deleteBook", () => {
    it("throws when deleting the Main book", async () => {
      await expect(deleteBook("book_main")).rejects.toThrow(/Cannot delete Main/i)
    })

    it("throws when deleting a book with transactions", async () => {
      // Create a new book and add a transaction to it, then verify deletion is blocked
      const book = await createBook({ name: "Book With Tx" })
      await createTransaction({
        bookId: book.id,
        amount: -50,
        categoryName: "Groceries",
      })

      await expect(deleteBook(book.id)).rejects.toThrow(
        /Cannot delete book/i,
      )
    })

    it("deletes an empty book", async () => {
      const created = await createBook({ name: "Temp Book" })
      await expect(deleteBook(created.id)).resolves.toBeUndefined()
    })
  })

  describe("addGlobalShare", () => {
    it("adds a global share and returns userId, email, affectedBooks", async () => {
      const result = await addGlobalShare("friend@example.com")
      expect(result).toMatchObject({
        userId: "usr_2",
        email: "friend@example.com",
        affectedBooks: expect.any(Number),
      })
    })

    it("throws 404 for unknown email", async () => {
      await expect(addGlobalShare("unknown@example.com")).rejects.toThrow(
        /User not found/i,
      )
    })

    it("throws 400 for self-share", async () => {
      await expect(addGlobalShare("john@example.com")).rejects.toThrow(
        /Cannot share with yourself/i,
      )
    })

    it("throws 409 for existing share", async () => {
      await expect(addGlobalShare("friend@example.com")).rejects.toThrow(
        /Already shared/i,
      )
    })
  })

  describe("removeGlobalShare", () => {
    it("removes a global share successfully", async () => {
      await expect(
        removeGlobalShare("usr_2"),
      ).resolves.toBeUndefined()
    })

    it("throws 404 for non-shared user", async () => {
      await expect(
        removeGlobalShare("usr_nonexistent"),
      ).rejects.toThrow(/Share not found/i)
    })
  })

  describe("sharing", () => {
    it("adds a share with edit permission", async () => {
      const result = await addShare("book_main", {
        email: "friend@example.com",
        permission: "edit",
      })
      expect(result).toMatchObject({
        userId: expect.any(String),
        permission: "edit",
      })
    })

    it("updates share permission", async () => {
      // First add, then update — uses a fresh share to avoid conflicts
      await addShare("book_vacation", {
        email: "friend@example.com",
        permission: "edit",
      })
      const result = await updateShare("book_vacation", "usr_2", {
        permission: "view",
      })
      expect(result.permission).toBe("view")
    })

    it("removes a share", async () => {
      await expect(
        removeShare("book_vacation", "usr_2"),
      ).resolves.toBeUndefined()
    })
  })

  describe("closeBook / reopenBook", () => {
    it("closes a book and creates a balancing transaction", async () => {
      const result = await closeBook("book_vacation", {
        closingCategoryName: "Transfers",
      })
      expect(result).toMatchObject({
        bookId: "book_vacation",
        status: "closed",
        closingTransactionId: expect.any(String),
        netBalance: expect.any(Number),
      })
    })

    it("reopens a closed book", async () => {
      const result = await reopenBook("book_vacation")
      expect(result).toMatchObject({
        bookId: "book_vacation",
        status: "open",
      })
    })

    it("throws when reopening a non-closed book", async () => {
      await expect(reopenBook("book_main")).rejects.toThrow(/Book is not closed/i)
    })
  })

  describe("getBook after close", () => {
    it("returns closedAt after closing", async () => {
      await closeBook("book_vacation", { closingCategoryName: "Transfers" })
      const book = await getBook("book_vacation")
      expect(book.status).toBe("closed")
      expect(book.closedAt).toBeTruthy()
    })
  })
})