// ---------------------------------------------------------------------------
// Unit tests — OfflineUserStore
// ---------------------------------------------------------------------------

import { describe, expect, it, beforeEach, afterEach } from "vitest"
import { OfflineUserStore } from "./OfflineUserStore"

const LOCAL_USER_KEY = "ledger12.localUserId"

describe("OfflineUserStore", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    OfflineUserStore.reset()
  })

  describe("constructor", () => {
    it("generates a UUID on first instantiation and persists it", () => {
      const store = new OfflineUserStore()
      const id = store.getUserId()

      expect(id).toBeTruthy()
      expect(typeof id).toBe("string")
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )

      const stored = localStorage.getItem(LOCAL_USER_KEY)
      expect(stored).toBe(id)
    })

    it("reuses an existing user ID from localStorage", () => {
      const existingId = "550e8400-e29b-41d4-a716-446655440000"
      localStorage.setItem(LOCAL_USER_KEY, existingId)

      const store = new OfflineUserStore()
      expect(store.getUserId()).toBe(existingId)
    })

    it("returns the same user across multiple instantiations", () => {
      const store1 = new OfflineUserStore()
      const id1 = store1.getUserId()

      const store2 = new OfflineUserStore()
      const id2 = store2.getUserId()

      expect(id1).toBe(id2)
    })
  })

  describe("getUserId", () => {
    it("returns the user ID", () => {
      const store = new OfflineUserStore()
      const id = store.getUserId()
      expect(id).toBeTruthy()
    })
  })

  describe("getUser", () => {
    it("returns a UserSummary with id and email", () => {
      const store = new OfflineUserStore()
      const user = store.getUser()

      expect(user).toMatchObject({
        id: expect.any(String),
        email: "local@ledger12.app",
      })
    })

    it("returns a copy, not a reference to internal state", () => {
      const store = new OfflineUserStore()
      const user1 = store.getUser()
      const user2 = store.getUser()

      expect(user1).toEqual(user2)
      expect(user1).not.toBe(user2)
    })
  })

  describe("reset", () => {
    it("removes the stored user ID from localStorage", () => {
      // Create a store so it writes to localStorage
      new OfflineUserStore()
      expect(localStorage.getItem(LOCAL_USER_KEY)).toBeTruthy()

      OfflineUserStore.reset()
      expect(localStorage.getItem(LOCAL_USER_KEY)).toBeNull()
    })

    it("causes the next store to generate a new ID", () => {
      const store1 = new OfflineUserStore()
      const id1 = store1.getUserId()

      OfflineUserStore.reset()

      const store2 = new OfflineUserStore()
      const id2 = store2.getUserId()

      expect(id2).not.toBe(id1)
    })
  })
})