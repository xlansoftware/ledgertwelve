// ---------------------------------------------------------------------------
// Unit tests — OfflineUsersService
// ---------------------------------------------------------------------------

import { describe, expect, it, vi, beforeEach } from "vitest"
import { createMockUserStore } from "./__tests__/user-store.mock"
import type { MockUserStore } from "./__tests__/user-store.mock"

const mockUserStore: MockUserStore = createMockUserStore()

vi.mock("./OfflineUserStore", () => ({
  OfflineUserStore: vi.fn().mockImplementation(() => mockUserStore),
}))

// Must import after mock setup
const { OfflineUsersService } = await import("./OfflineUsersService")

describe("OfflineUsersService", () => {
  let service: InstanceType<typeof OfflineUsersService>

  beforeEach(() => {
    vi.clearAllMocks()
    service = new OfflineUsersService(mockUserStore)
  })

  describe("getUsers", () => {
    it("returns a single user from the user store", async () => {
      const users = await service.getUsers()

      expect(users).toHaveLength(1)
      expect(users[0]).toEqual({
        id: "test_user_001",
        email: "local@ledger12.app",
      })
    })

    it("calls the underlying user store", async () => {
      await service.getUsers()
      expect(mockUserStore.getUsers).toHaveBeenCalledTimes(1)
    })
  })
})