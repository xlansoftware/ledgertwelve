// ---------------------------------------------------------------------------
// Unit tests — categoriesService
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest"
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reassignCategories,
} from "./categoriesService"
import { login } from "./authService"

describe("categoriesService", () => {
  beforeAll(async () => {
    await login({ email: "john@example.com", password: "secret-password" })
  })
  describe("getCategories", () => {
    it("returns all categories for the current user", async () => {
      const result = await getCategories()
      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        recurring: expect.any(Boolean),
      })
    })

    it("includes expected default categories", async () => {
      const result = await getCategories()
      const names = result.map((c) => c.name)
      expect(names).toContain("Food")
      expect(names).toContain("Rent")
    })
  })

  describe("createCategory", () => {
    it("creates a category and returns it", async () => {
      const result = await createCategory({
        name: "Transport",
        color: "#00FF00",
        icon: "car",
      })
      expect(result).toMatchObject({
        name: "Transport",
        color: "#00FF00",
        icon: "car",
        recurring: false,
      })
      expect(result.id).toMatch(/^cat_/)
    })

    it("creates a recurring category", async () => {
      const result = await createCategory({
        name: "Insurance",
        recurring: true,
      })
      expect(result.name).toBe("Insurance")
      expect(result.recurring).toBe(true)
    })

    it("throws when name is missing", async () => {
      await expect(
        createCategory({ name: "" }),
      ).rejects.toThrow()
    })
  })

  describe("updateCategory", () => {
    it("updates category fields", async () => {
      const result = await updateCategory("cat_1", { name: "Groceries", color: "#FF0000" })
      expect(result.name).toBe("Groceries")
      expect(result.color).toBe("#FF0000")
    })

    it("throws on non-existent category", async () => {
      await expect(
        updateCategory("cat_nonexistent", { name: "X" }),
      ).rejects.toThrow(/Category not found/i)
    })
  })

  describe("deleteCategory", () => {
    it("deletes a category without reassignment", async () => {
      const result = await deleteCategory("cat_2")
      expect(result.reassignedTransactions).toBe(0)
    })

    it("deletes a category with reassignment", async () => {
      // Create a transaction referencing "Food" to trigger reassignment
      const result = await deleteCategory("cat_1", {
        replacementCategoryName: "Groceries",
      })
      expect(result.reassignedTransactions).toBeGreaterThanOrEqual(0)
    })

    it("throws on non-existent category", async () => {
      await expect(
        deleteCategory("cat_nonexistent"),
      ).rejects.toThrow(/Category not found/i)
    })
  })

  describe("reassignCategories", () => {
    it("reassigns transactions from one category to another", async () => {
      const result = await reassignCategories({
        fromCategoryName: "Food",
        toCategoryName: "Dining",
      })
      expect(result).toMatchObject({
        affectedTransactions: expect.any(Number),
      })
    })
  })
})