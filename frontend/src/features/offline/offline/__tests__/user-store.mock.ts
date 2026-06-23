// ---------------------------------------------------------------------------
// Mock factory for OfflineUserStore — returns consistent test identities
// ---------------------------------------------------------------------------

import { vi } from "vitest"

const TEST_USER_ID = "test_user_001"

export function createMockUserStore() {
  return {
    getUserId: vi.fn().mockReturnValue(TEST_USER_ID),
    getUser: vi.fn().mockReturnValue({ id: TEST_USER_ID, email: "local@ledger12.app" }),
  }
}

export type MockUserStore = ReturnType<typeof createMockUserStore>