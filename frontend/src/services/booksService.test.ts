// ---------------------------------------------------------------------------
// Unit tests — booksService
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"
import {
  getBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  addShare,
  updateShare,
  removeShare,
  closeBook,
  reopenBook,
} from "./booksService"
import { login } from "./authService"

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

    it("throws when deleting a non-empty book", async () => {
      await expect(deleteBook("book_vacation")).rejects.toThrow(
        /Cannot delete book/i,
      )
    })

    it("deletes an empty book", async () => {
      const created = await createBook({ name: "Temp Book" })
      await expect(deleteBook(created.id)).resolves.toBeUndefined()
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