// ---------------------------------------------------------------------------
// In-memory mock for the IndexedDB db module
//
// Usage in test files:
//
//   import { createMockDb, setupMockIdbKeyRange } from "./__tests__/db-mock"
//
//   const mockDb = createMockDb()
//   vi.mock("./db", () => mockDb.module)
//
// Then call mockDb.seed(...) in beforeEach to populate stores.
// Access mockDb.store directly to inspect or modify state.
// ---------------------------------------------------------------------------

import type { TransactionDto, BookDto, CategoryDto } from "@/types"

export const STORES = {
  books: "books",
  categories: "categories",
  transactions: "transactions",
  users: "users",
  sharedUsers: "sharedUsers",
} as const

export interface SharedUserEntry {
  bookId: string
  userId: string
  email: string
  permission: "view" | "edit"
}

export interface MockDbState {
  [STORES.books]: BookDto[]
  [STORES.categories]: CategoryDto[]
  [STORES.transactions]: TransactionDto[]
  [STORES.users]: { id: string; email: string }[]
  [STORES.sharedUsers]: SharedUserEntry[]
}

// ---------------------------------------------------------------------------
// IDBKeyRange mock
// jsdom does not provide IndexedDB, so the service code calling
// IDBKeyRange.bound(...) etc. would throw. This function patches
// globalThis.IDBKeyRange with a minimal mock.
// ---------------------------------------------------------------------------

export function setupMockIdbKeyRange(): void {
  if (typeof globalThis.IDBKeyRange !== "undefined") return

  class MockKeyRange {
    lower: unknown
    upper: unknown
    lowerOpen: boolean
    upperOpen: boolean

    constructor(lower: unknown, upper: unknown, lowerOpen: boolean, upperOpen: boolean) {
      this.lower = lower
      this.upper = upper
      this.lowerOpen = lowerOpen ?? false
      this.upperOpen = upperOpen ?? false
    }

    static bound(lower: unknown, upper: unknown, lowerOpen?: boolean, upperOpen?: boolean): MockKeyRange {
      return new MockKeyRange(lower, upper, lowerOpen ?? false, upperOpen ?? false)
    }

    static lowerBound(lower: unknown, open?: boolean): MockKeyRange {
      return new MockKeyRange(lower, undefined, open ?? false, false)
    }

    static upperBound(upper: unknown, open?: boolean): MockKeyRange {
      return new MockKeyRange(undefined, upper, false, open ?? false)
    }

    static only(value: unknown): MockKeyRange {
      return new MockKeyRange(value, value, false, false)
    }

    /** Simulate whether a compound key value falls within the range. */
    includes(value: unknown): boolean {
      // Simulate IndexedDB compound-key range matching for [bookId, dateTime]
      if (Array.isArray(value) && Array.isArray(this.lower) && Array.isArray(this.upper)) {
        const v0 = value[0]
        const v1 = value[1]
        const l0 = this.lower[0]
        const l1 = this.lower[1]
        const u0 = this.upper[0]
        const u1 = this.upper[1]

        // Check lower bound
        if (this.lower !== undefined) {
          if (v0 < l0) return false
          if (v0 === l0) {
            if (this.lowerOpen ? v1 <= l1 : v1 < l1) return false
          }
        }

        // Check upper bound
        if (this.upper !== undefined) {
          if (v0 > u0) return false
          if (v0 === u0) {
            if (this.upperOpen ? v1 >= u1 : v1 > u1) return false
          }
        }

        return true
      }

      // Simple value matching
      const lowerVal = this.lower as number
      const upperVal = this.upper as number
      const val = value as number

      if (this.lower !== undefined) {
        if (this.lowerOpen ? val <= lowerVal : val < lowerVal) return false
      }
      if (this.upper !== undefined) {
        if (this.upperOpen ? val >= upperVal : val > upperVal) return false
      }
      return true
    }
  }

  globalThis.IDBKeyRange = MockKeyRange as unknown as typeof IDBKeyRange
}

// ---------------------------------------------------------------------------
// Mock factory
// ---------------------------------------------------------------------------

export function createMockDb() {
  const state: MockDbState = {
    [STORES.books]: [],
    [STORES.categories]: [],
    [STORES.transactions]: [],
    [STORES.users]: [],
    [STORES.sharedUsers]: [],
  }

  const module = {
    STORES,

    async getAll<T>(storeName: string): Promise<T[]> {
      return [...(state[storeName as keyof MockDbState] as unknown as T[])]
    },

    async getById<T>(storeName: string, id: string): Promise<T | undefined> {
      const items = state[storeName as keyof MockDbState] as any[]
      return items.find((x: any) => x.id === id) as T | undefined
    },

    async put<T>(storeName: string, value: T): Promise<void> {
      const items = state[storeName as keyof MockDbState] as any[]
      const idx = items.findIndex((x: any) => x.id === (value as any).id)
      if (idx >= 0) {
        items[idx] = value
      } else {
        items.push(value)
      }
    },

    async remove(storeName: string, id: string): Promise<void> {
      const items = state[storeName as keyof MockDbState] as any[]
      const idx = items.findIndex((x: any) => x.id === id)
      if (idx >= 0) {
        items.splice(idx, 1)
      }
    },

    async clearStore(storeName: string): Promise<void> {
      const key = storeName as keyof MockDbState
      ;(state[key] as any[]) = []
    },

    async getAllByIndex<T>(
      storeName: string,
      indexName: string,
      value: string,
    ): Promise<T[]> {
      const items = state[storeName as keyof MockDbState] as any[]
      return items.filter((x: any) => {
        if (storeName === STORES.transactions && indexName === "bookId") {
          return x.bookId === value
        }
        return x[indexName] === value
      }) as T[]
    },

    async getAllByIndexRange<T>(
      storeName: string,
      _indexName: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      range: any,
    ): Promise<T[]> {
      const items = state[storeName as keyof MockDbState] as any[]
      return items.filter((x: any) => {
        // For compound index [bookId, dateTime]
        if (_indexName === "bookId_dateTime") {
          const idxVal: [string, string] = [x.bookId, x.dateTime]
          return range.includes(idxVal)
        }
        // Fallback: single field
        const val = x[_indexName]
        return range.includes(val)
      }) as T[]
    },

    async getAllSharedUsersForBook(bookId: string): Promise<SharedUserEntry[]> {
      return state[STORES.sharedUsers].filter((e) => e.bookId === bookId)
    },

    async removeSharedUser(bookId: string, userId: string): Promise<void> {
      const idx = state[STORES.sharedUsers].findIndex(
        (e) => e.bookId === bookId && e.userId === userId,
      )
      if (idx >= 0) {
        state[STORES.sharedUsers].splice(idx, 1)
      }
    },

    async clearAllSharedUsersForBook(bookId: string): Promise<void> {
      state[STORES.sharedUsers] = state[STORES.sharedUsers].filter(
        (e) => e.bookId !== bookId,
      )
    },

    // Expose the state for assertions and seeding
    _state: state,

    // Helper to seed data into a store
    _seed<T>(storeName: string, items: T[]): void {
      const key = storeName as keyof MockDbState
      ;(state[key] as T[]) = [...items]
    },

    // Helper to reset all stores
    _reset(): void {
      state[STORES.books] = []
      state[STORES.categories] = []
      state[STORES.transactions] = []
      state[STORES.users] = []
      state[STORES.sharedUsers] = []
    },
  }

  return module
}