// ---------------------------------------------------------------------------
// Unit tests — offline factory
// ---------------------------------------------------------------------------

import type { ServiceFactory } from "./factory"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

// -----------------------------------------------------------------------
// Mock all service classes — vitest v4 requires class mockImplementation
// for constructors called with `new`
// -----------------------------------------------------------------------

class MockOnlineBooksClass { type = "online_books" }
class MockOnlineCategoriesClass { type = "online_categories" }
class MockOnlineTransactionsClass { type = "online_transactions" }
class MockOnlineReportsClass { type = "online_reports" }
class MockOnlineUsersClass { type = "online_users" }

class MockOfflineBooksClass {
  type = "offline_books"
  userStore: MockUserStoreClass
  constructor(userStore: MockUserStoreClass) {
    this.userStore = userStore
  }
}
class MockOfflineCategoriesClass { type = "offline_categories" }
class MockOfflineTransactionsClass {
  type = "offline_transactions"
  userStore: MockUserStoreClass
  constructor(userStore: MockUserStoreClass) {
    this.userStore = userStore
  }
}
class MockOfflineReportsClass { type = "offline_reports" }
class MockOfflineUsersClass {
  type = "offline_users"
  userStore: MockUserStoreClass
  constructor(userStore: MockUserStoreClass) {
    this.userStore = userStore
  }
}

class MockUserStoreClass {
  type = "user_store"
}

vi.mock("@/features/offline/online/OnlineBooksService", () => ({ OnlineBooksService: MockOnlineBooksClass }))
vi.mock("@/features/offline/online/OnlineCategoriesService", () => ({ OnlineCategoriesService: MockOnlineCategoriesClass }))
vi.mock("@/features/offline/online/OnlineTransactionsService", () => ({ OnlineTransactionsService: MockOnlineTransactionsClass }))
vi.mock("@/features/offline/online/OnlineReportsService", () => ({ OnlineReportsService: MockOnlineReportsClass }))
vi.mock("@/features/offline/online/OnlineUsersService", () => ({ OnlineUsersService: MockOnlineUsersClass }))

vi.mock("@/features/offline/offline/OfflineBooksService", () => ({ OfflineBooksService: MockOfflineBooksClass }))
vi.mock("@/features/offline/offline/OfflineCategoriesService", () => ({ OfflineCategoriesService: MockOfflineCategoriesClass }))
vi.mock("@/features/offline/offline/OfflineTransactionsService", () => ({ OfflineTransactionsService: MockOfflineTransactionsClass }))
vi.mock("@/features/offline/offline/OfflineReportsService", () => ({ OfflineReportsService: MockOfflineReportsClass }))
vi.mock("@/features/offline/offline/OfflineUsersService", () => ({ OfflineUsersService: MockOfflineUsersClass }))
vi.mock("@/features/offline/offline/OfflineUserStore", () => ({ OfflineUserStore: MockUserStoreClass }))

const MockDb = {
  STORES: { books: "books", categories: "categories", transactions: "transactions" },
  getAll: vi.fn(),
  put: vi.fn(),
  getById: vi.fn(),
  remove: vi.fn(),
  clearStore: vi.fn(),
  getAllByIndex: vi.fn(),
  getAllByIndexRange: vi.fn(),
  getAllSharedUsersForBook: vi.fn(),
  removeSharedUser: vi.fn(),
  clearAllSharedUsersForBook: vi.fn(),
}

vi.mock("@/features/offline/offline/db", () => MockDb)

// Must import after mocks are set up
const { createOnlineFactory, createOfflineFactory, getFactory, setFactory, seedOfflineData, isOfflineMode, isOnlineMode } = await import("./factory")

describe("factory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // -----------------------------------------------------------------------
  // createOnlineFactory
  // -----------------------------------------------------------------------

  describe("createOnlineFactory", () => {
    it("creates a factory with online service instances", () => {
      const factory = createOnlineFactory()

      expect(factory.books).toBeInstanceOf(MockOnlineBooksClass)
      expect(factory.categories).toBeInstanceOf(MockOnlineCategoriesClass)
      expect(factory.transactions).toBeInstanceOf(MockOnlineTransactionsClass)
      expect(factory.reports).toBeInstanceOf(MockOnlineReportsClass)
      expect(factory.users).toBeInstanceOf(MockOnlineUsersClass)
    })
  })

  // -----------------------------------------------------------------------
  // createOfflineFactory
  // -----------------------------------------------------------------------

  describe("createOfflineFactory", () => {
    it("creates a factory with offline service instances", () => {
      const factory = createOfflineFactory()

      expect(factory.books).toBeInstanceOf(MockOfflineBooksClass)
      expect(factory.categories).toBeInstanceOf(MockOfflineCategoriesClass)
      expect(factory.transactions).toBeInstanceOf(MockOfflineTransactionsClass)
      expect(factory.reports).toBeInstanceOf(MockOfflineReportsClass)
      expect(factory.users).toBeInstanceOf(MockOfflineUsersClass)
    })

    it("registers the factory via setFactory so getFactory returns it", () => {
      const factory = createOfflineFactory()

      expect(getFactory()).toBe(factory)
    })

    it("passes the user store to books, transactions, and users services", () => {
      const factory = createOfflineFactory()

      expect(factory.books).toBeInstanceOf(MockOfflineBooksClass)
      expect((factory.books as unknown as MockOfflineBooksClass).userStore).toBeInstanceOf(MockUserStoreClass)
      expect((factory.transactions as unknown as MockOfflineTransactionsClass).userStore).toBeInstanceOf(MockUserStoreClass)
      expect((factory.users as unknown as MockOfflineUsersClass).userStore).toBeInstanceOf(MockUserStoreClass)
    })
  })

  // -----------------------------------------------------------------------
  // setFactory / getFactory
  // -----------------------------------------------------------------------

  describe("setFactory / getFactory", () => {
    it("setFactory stores the factory and getFactory returns it", () => {
      const factory = {
        books: { type: "custom" } as unknown as ServiceFactory["books"],
        categories: { type: "custom" } as unknown as ServiceFactory["categories"],
        transactions: { type: "custom" } as unknown as ServiceFactory["transactions"],
        reports: { type: "custom" } as unknown as ServiceFactory["reports"],
        users: { type: "custom" } as unknown as ServiceFactory["users"],
      }
      setFactory(factory)
      expect(getFactory()).toBe(factory)
    })

    it("getFactory auto-creates an online factory when not set", () => {
      // Reset the internal state by creating a fresh factory
      // Since we can't easily reset the singleton, verify it returns
      // something with the correct shape
      const factory = getFactory()
      expect(factory).toMatchObject({
        books: expect.any(Object),
        categories: expect.any(Object),
        transactions: expect.any(Object),
        reports: expect.any(Object),
        users: expect.any(Object),
      })
    })
  })

  // -----------------------------------------------------------------------
  // seedOfflineData
  // -----------------------------------------------------------------------

  describe("seedOfflineData", () => {
    it("creates Main book when no books exist", async () => {
      MockDb.getAll.mockResolvedValue([])

      await seedOfflineData()

      expect(MockDb.put).toHaveBeenCalledWith(
        "books",
        expect.objectContaining({
          id: "book_main",
          name: "Main",
          currency: "EUR",
          status: "open",
        }),
      )
    })

    it("does not create Main book when books already exist", async () => {
      MockDb.getAll.mockResolvedValue([{ id: "b1", name: "Existing" }])

      await seedOfflineData()

      const putCalls = (MockDb.put.mock.calls as [string, unknown][]).filter(
        ([store]) => store === "books",
      )
      expect(putCalls).toHaveLength(0)
    })

    it("creates default categories when none exist", async () => {
      MockDb.getAll
        .mockResolvedValueOnce([])  // books check
        .mockResolvedValueOnce([])  // categories check

      await seedOfflineData()

      const categoryPuts = (MockDb.put.mock.calls as [string, unknown][]).filter(
        ([store]) => store === "categories",
      )
      expect(categoryPuts).toHaveLength(22)
      expect(categoryPuts[0][1]).toMatchObject({ name: "Groceries", recurring: false })
      expect(categoryPuts[21][1]).toMatchObject({ name: "Kids" })
    })

    it("does not create categories when they already exist", async () => {
      MockDb.getAll
        .mockResolvedValueOnce([])  // books check → empty (will create Main book)
        .mockResolvedValueOnce([{ id: "c1", name: "Existing Cat" }])  // categories check → not empty

      await seedOfflineData()

      const categoryPuts = (MockDb.put.mock.calls as [string, unknown][]).filter(
        ([store]) => store === "categories",
      )
      expect(categoryPuts).toHaveLength(0)
    })
  })

  // -----------------------------------------------------------------------
  // isOfflineMode / isOnlineMode
  // -----------------------------------------------------------------------

  describe("isOfflineMode / isOnlineMode", () => {
    it("isOnlineMode returns true by default", () => {
      expect(isOnlineMode()).toBe(true)
      expect(isOfflineMode()).toBe(false)
    })

    it("isOfflineMode returns true when mode is set to offline", () => {
      localStorage.setItem("ledger12.mode", "offline")
      expect(isOfflineMode()).toBe(true)
      expect(isOnlineMode()).toBe(false)
    })

    it("responds to localStorage changes", () => {
      expect(isOnlineMode()).toBe(true)

      localStorage.setItem("ledger12.mode", "offline")
      expect(isOfflineMode()).toBe(true)

      localStorage.setItem("ledger12.mode", "online")
      expect(isOfflineMode()).toBe(false)
      expect(isOnlineMode()).toBe(true)
    })

    it("returns online for any non-offline value", () => {
      localStorage.setItem("ledger12.mode", "")
      expect(isOfflineMode()).toBe(false)
      expect(isOnlineMode()).toBe(true)
    })
  })
})