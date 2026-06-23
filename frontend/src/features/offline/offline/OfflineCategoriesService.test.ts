// ---------------------------------------------------------------------------
// Unit tests — OfflineCategoriesService
// ---------------------------------------------------------------------------

import type { CategoryDto, TransactionDto } from "@/types"
import type { SharedUserEntry } from "./db"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { setupMockIdbKeyRange } from "./__tests__/db-mock"

// ---- Hoisted mock setup ----

setupMockIdbKeyRange()

// Inline mock for db — avoid import inside vi.mock which is hoisted
const STORES = { books: "books", categories: "categories", transactions: "transactions", users: "users", sharedUsers: "sharedUsers" }

let mockStore: {
  books: CategoryDto[]
  categories: CategoryDto[]
  transactions: TransactionDto[]
  users: { id: string; email: string }[]
  sharedUsers: SharedUserEntry[]
} = {
  books: [],
  categories: [],
  transactions: [],
  users: [],
  sharedUsers: [],
}

function mockReset() {
  mockStore = { books: [], categories: [], transactions: [], users: [], sharedUsers: [] }
}
mockReset()

const mockDb = {
  STORES,
  async getAll<T>(storeName: string): Promise<T[]> {
    const items = mockStore[storeName as keyof typeof mockStore] as unknown as T[]
    return [...items]
  },
  async getById<T>(storeName: string, id: string): Promise<T | undefined> {
    const items = mockStore[storeName as keyof typeof mockStore] as unknown as T[]
    return items.find((x) => (x as unknown as { id: string }).id === id)
  },
  async put<T>(storeName: string, value: T): Promise<void> {
    const items = mockStore[storeName as keyof typeof mockStore] as unknown as T[]
    const valueWithId = value as unknown as { id: string }
    const idx = items.findIndex((x) => (x as unknown as { id: string }).id === valueWithId.id)
    if (idx >= 0) items[idx] = value
    else items.push(value)
  },
  async remove(storeName: string, id: string): Promise<void> {
    const items = mockStore[storeName as keyof typeof mockStore] as unknown as { id: string }[]
    const idx = items.findIndex((x) => x.id === id)
    if (idx >= 0) (mockStore[storeName as keyof typeof mockStore] as unknown as { id: string }[]).splice(idx, 1)
  },
  async clearStore(storeName: string): Promise<void> {
    const key = storeName as keyof typeof mockStore
    if (Array.isArray(mockStore[key])) {
      (mockStore[key] as unknown[]).length = 0
    }
  },
  async getAllByIndex<T>(storeName: string, _indexName: string, value: string): Promise<T[]> {
    const items = mockStore[storeName as keyof typeof mockStore] as unknown as T[]
    return items.filter((x) => (x as unknown as Record<string, string>)[_indexName] === value)
  },
  getAllByIndexRange: vi.fn().mockResolvedValue([]),
  async getAllSharedUsersForBook(bookId: string): Promise<SharedUserEntry[]> {
    return mockStore.sharedUsers.filter((e) => e.bookId === bookId)
  },
  async removeSharedUser(bookId: string, userId: string): Promise<void> {
    const idx = mockStore.sharedUsers.findIndex((e) => e.bookId === bookId && e.userId === userId)
    if (idx >= 0) mockStore.sharedUsers.splice(idx, 1)
  },
  async clearAllSharedUsersForBook(bookId: string): Promise<void> {
    mockStore.sharedUsers = mockStore.sharedUsers.filter((e) => e.bookId !== bookId)
  },
}

vi.mock("./db", () => mockDb)

const { OfflineCategoriesService } = await import("./OfflineCategoriesService")

// ---- Tests ----

describe("OfflineCategoriesService", () => {
  let service: InstanceType<typeof OfflineCategoriesService>

  beforeEach(() => {
    mockReset()
    service = new OfflineCategoriesService()
  })

  describe("getCategories", () => {
    it("returns all categories sorted by order field ascending", async () => {
      mockStore.categories = [
        { id: "cat_1", name: "Groceries", recurring: false, color: "#fde68a", icon: "shopping-cart", createdAt: "2026-01-01T00:00:00.000Z", order: 2 },
        { id: "cat_2", name: "Rent", recurring: true, color: "#fca5a5", icon: "home", createdAt: "2026-01-01T00:00:00.000Z", order: 1 },
        { id: "cat_3", name: "Utilities", recurring: true, color: "#a5b4fc", icon: "plug", createdAt: "2026-01-01T00:00:00.000Z", order: 3 },
      ]
      const result = await service.getCategories()

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe("Rent")   // order: 1
      expect(result[1].name).toBe("Groceries") // order: 2
      expect(result[2].name).toBe("Utilities") // order: 3
    })

    it("sorts by name alphabetically when order is undefined", async () => {
      mockStore.categories = [
        { id: "c1", name: "Zebras", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "c2", name: "Apples", createdAt: "2026-01-01T00:00:00.000Z" },
        { id: "c3", name: "Bananas", createdAt: "2026-01-01T00:00:00.000Z" },
      ]
      const result = await service.getCategories()

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe("Apples")
      expect(result[1].name).toBe("Bananas")
      expect(result[2].name).toBe("Zebras")
    })

    it("returns an empty array when no categories exist", async () => {
      const result = await service.getCategories()
      expect(result).toEqual([])
    })
  })

  describe("createCategory", () => {
    it("creates a category with the provided fields", async () => {
      const result = await service.createCategory({
        name: "Transport",
        recurring: true,
        color: "#bbf7d0",
        icon: "car",
        order: 5,
      })

      expect(result).toMatchObject({
        name: "Transport",
        recurring: true,
        color: "#bbf7d0",
        icon: "car",
        order: 5,
      })
      expect(result.id).toBeTruthy()
      expect(result.createdAt).toBeTruthy()
    })

    it("applies defaults for optional fields", async () => {
      const result = await service.createCategory({ name: "Misc" })

      expect(result.recurring).toBe(false)
      expect(result.color).toBe("#000000")
      expect(result.icon).toBe("question")
    })

    it("persists the category in the database", async () => {
      const created = await service.createCategory({ name: "Saved Cat" })
      const stored = mockStore.categories.find((c) => c.id === created.id)
      expect(stored).toBeDefined()
      expect(stored?.name).toBe("Saved Cat")
    })
  })

  describe("updateCategory", () => {
    let catId: string

    beforeEach(async () => {
      const cat = await service.createCategory({ name: "Old Name" })
      catId = cat.id
    })

    it("updates specific fields", async () => {
      const result = await service.updateCategory(catId, {
        name: "New Name",
        recurring: true,
        color: "#ff0000",
      })

      expect(result.name).toBe("New Name")
      expect(result.recurring).toBe(true)
      expect(result.color).toBe("#ff0000")
      expect(result.icon).toBe("question")
    })

    it("throws on non-existent category", async () => {
      await expect(
        service.updateCategory("non_existent", { name: "Nope" }),
      ).rejects.toThrow("Category not found")
    })
  })

  describe("deleteCategory", () => {
    it("deletes a category", async () => {
      const cat = await service.createCategory({ name: "To Delete" })
      await service.deleteCategory(cat.id)

      const stored = mockStore.categories.find((c) => c.id === cat.id)
      expect(stored).toBeUndefined()
    })

    it("returns reassignedTransactions = 0 when no replacement specified", async () => {
      const cat = await service.createCategory({ name: "Temp" })
      const result = await service.deleteCategory(cat.id)
      expect(result).toEqual({ reassignedTransactions: 0 })
    })

    it("reassigns transactions to replacement category", async () => {
      const cat = await service.createCategory({ name: "OldCat" })
      mockStore.transactions = [
        { id: "tx_1", bookId: "b1", userId: "u1", amount: 100, categoryName: "OldCat", dateTime: "2026-01-01", createdAt: "2026-01-01" },
        { id: "tx_2", bookId: "b1", userId: "u1", amount: 200, categoryName: "OldCat", dateTime: "2026-01-02", createdAt: "2026-01-02" },
        { id: "tx_3", bookId: "b1", userId: "u1", amount: 300, categoryName: "Other", dateTime: "2026-01-03", createdAt: "2026-01-03" },
      ]

      const result = await service.deleteCategory(cat.id, { replacementCategoryName: "NewCat" })

      expect(result).toEqual({ reassignedTransactions: 2 })

      const tx1 = mockStore.transactions.find((t) => t.id === "tx_1")
      expect(tx1?.categoryName).toBe("NewCat")
      const tx3 = mockStore.transactions.find((t) => t.id === "tx_3")
      expect(tx3?.categoryName).toBe("Other")
    })

    it("throws on non-existent category", async () => {
      await expect(service.deleteCategory("non_existent")).rejects.toThrow(
        "Category not found",
      )
    })
  })

  describe("reassignCategories", () => {
    it("reassigns transactions from one category to another", async () => {
      mockStore.transactions = [
        { id: "tx_1", bookId: "b1", userId: "u1", amount: 10, categoryName: "A", dateTime: "2026-01-01", createdAt: "2026-01-01" },
        { id: "tx_2", bookId: "b1", userId: "u1", amount: 20, categoryName: "A", dateTime: "2026-01-02", createdAt: "2026-01-02" },
        { id: "tx_3", bookId: "b1", userId: "u1", amount: 30, categoryName: "B", dateTime: "2026-01-03", createdAt: "2026-01-03" },
      ]

      const result = await service.reassignCategories({
        fromCategoryName: "A",
        toCategoryName: "B",
      })

      expect(result).toEqual({ affectedTransactions: 2 })
      expect(mockStore.transactions.filter((t) => t.categoryName === "B")).toHaveLength(3)
      expect(mockStore.transactions.filter((t) => t.categoryName === "A")).toHaveLength(0)
    })

    it("returns 0 when no transactions match", async () => {
      const result = await service.reassignCategories({
        fromCategoryName: "NonExistent",
        toCategoryName: "B",
      })
      expect(result).toEqual({ affectedTransactions: 0 })
    })
  })

  describe("reorderCategories", () => {
    it("reorders categories based on provided ID list", async () => {
      mockStore.categories = [
        { id: "cat_1", name: "Groceries", recurring: false, color: "#fde68a", icon: "shopping-cart", createdAt: "2026-01-01T00:00:00.000Z", order: 2 },
        { id: "cat_2", name: "Rent", recurring: true, color: "#fca5a5", icon: "home", createdAt: "2026-01-01T00:00:00.000Z", order: 1 },
        { id: "cat_3", name: "Utilities", recurring: true, color: "#a5b4fc", icon: "plug", createdAt: "2026-01-01T00:00:00.000Z", order: 3 },
      ]

      await service.reorderCategories({
        orderedIds: ["cat_3", "cat_1", "cat_2"],
      })

      const cats = await service.getCategories()
      expect(cats[0].id).toBe("cat_3")
      expect(cats[0].order).toBe(1)
      expect(cats[1].id).toBe("cat_1")
      expect(cats[1].order).toBe(2)
      expect(cats[2].id).toBe("cat_2")
      expect(cats[2].order).toBe(3)
    })

    it("returns success: true", async () => {
      mockStore.categories = [
        { id: "cat_1", name: "A" },
        { id: "cat_2", name: "B" },
      ]
      const result = await service.reorderCategories({
        orderedIds: ["cat_1", "cat_2"],
      })
      expect(result).toEqual({ success: true })
    })
  })
})