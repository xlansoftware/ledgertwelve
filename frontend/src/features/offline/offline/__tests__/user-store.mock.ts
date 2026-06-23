// ---------------------------------------------------------------------------
// Mock factory for OfflineUserStore — returns consistent test identities
// ---------------------------------------------------------------------------

import { vi } from "vitest"
import type { IUsersService } from "../../interfaces/IUsersService"

const TEST_USER_ID = "test_user_001"

export function createMockUserStore(): IUsersService {
  return {
    getUsers: vi.fn().mockReturnValue([{ id: TEST_USER_ID, email: "local@ledger12.app" }]),
  }
}

export type MockUserStore = ReturnType<typeof createMockUserStore>