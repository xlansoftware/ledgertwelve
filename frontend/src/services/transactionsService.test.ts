// ---------------------------------------------------------------------------
// Unit tests — transactionsService
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"
import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "./transactionsService"
import { closeBook } from "./booksService"
import { login } from "./authService"

describe("transactionsService", () => {
  beforeAll(async () => {
    await login({ email: "john@example.com", password: "secret-password" })
  })

  describe("getTransactions", () => {
    it("returns paginated transactions", async () => {
      const result = await getTransactions()
      expect(result).toMatchObject({
        items: expect.any(Array),
        page: 1,
        pageSize: 50,
        total: expect.any(Number),
      })
    })

    it("filters by bookId", async () => {
      const result = await getTransactions({ bookId: "book_main" })
      expect(result.items.every((tx) => tx.bookId === "book_main")).toBe(true)
    })

    it("filters by date range", async () => {
      const result = await getTransactions({
        from: "2026-05-01",
        to: "2026-05-31",
      })
      expect(result.items.length).toBeGreaterThanOrEqual(1)
    })

    it("filters by category", async () => {
      const result = await getTransactions({ category: "Food" })
      expect(result.items.every((tx) => tx.categoryName === "Food")).toBe(true)
    })

    it("returns empty items for non-matching filters", async () => {
      const result = await getTransactions({ category: "NonExistent" })
      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe("getTransaction", () => {
    it("returns a single transaction by id", async () => {
      // Create a known transaction then fetch it to avoid flakiness from random mock data
      const created = await createTransaction({
        bookId: "book_main",
        amount: -99,
        categoryName: "Groceries",
        note: "Test fetch",
      })
      const result = await getTransaction(created.id)
      expect(result).toMatchObject({
        id: created.id,
        bookId: "book_main",
        amount: -99,
        categoryName: "Groceries",
        note: "Test fetch",
      })
    })

    it("throws on non-existent transaction", async () => {
      await expect(getTransaction("tx_invalid")).rejects.toThrow(
        /Transaction not found/i,
      )
    })
  })

  describe("createTransaction", () => {
    it("creates a simple transaction", async () => {
      const result = await createTransaction({
        bookId: "book_main",
        amount: -50,
        categoryName: "Groceries",
        note: "Test",
      })
      expect(result).toMatchObject({
        bookId: "book_main",
        amount: -50,
        categoryName: "Groceries",
        note: "Test",
      })
      expect(result.id).toMatch(/^tx_/)
      expect(result.userId).toBe("usr_1")
    })

    it("creates a multi-currency transaction", async () => {
      const result = await createTransaction({
        bookId: "book_main",
        amount: -91,
        originalCurrency: "USD",
        originalAmount: -100,
        exchangeRate: 0.91,
        categoryName: "Shopping",
      })
      expect(result.originalCurrency).toBe("USD")
      expect(result.originalAmount).toBe(-100)
      expect(result.exchangeRate).toBe(0.91)
    })

    it("throws when creating in a closed book", async () => {
      // Close the vacation book first
      await closeBook("book_vacation", {
        closingCategoryName: "Transfers",
      })

      await expect(
        createTransaction({
          bookId: "book_vacation",
          amount: -10,
        }),
      ).rejects.toThrow(/closed/i)
    })
  })

  describe("updateTransaction", () => {
    let txId: string

    beforeAll(async () => {
      const created = await createTransaction({
        bookId: "book_main",
        amount: -50,
        categoryName: "Groceries",
        note: "To be updated",
      })
      txId = created.id
    })

    it("updates transaction fields", async () => {
      const result = await updateTransaction(txId, {
        amount: -200,
        note: "Updated note",
      })
      expect(result.amount).toBe(-200)
      expect(result.note).toBe("Updated note")
    })

    it("updates category", async () => {
      const result = await updateTransaction(txId, {
        categoryName: "Dining",
      })
      expect(result.categoryName).toBe("Dining")
    })

    it("throws on non-existent transaction", async () => {
      await expect(
        updateTransaction("tx_invalid", { amount: 0 }),
      ).rejects.toThrow(/Transaction not found/i)
    })
  })

  describe("deleteTransaction", () => {
    it("deletes a transaction", async () => {
      const created = await createTransaction({
        bookId: "book_main",
        amount: -10,
        categoryName: "Miscellaneous",
      })
      await expect(deleteTransaction(created.id)).resolves.toBeUndefined()
    })

    it("throws on non-existent transaction", async () => {
      await expect(deleteTransaction("tx_invalid")).rejects.toThrow(
        /Transaction not found/i,
      )
    })
  })
})