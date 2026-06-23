// ---------------------------------------------------------------------------
// OfflineUsersService — returns the single local user
// ---------------------------------------------------------------------------

import type { UserSummary } from "@/types"
import type { IUsersService } from "@/features/offline/interfaces/IUsersService"
import { OfflineUserStore } from "./OfflineUserStore"

export class OfflineUsersService implements IUsersService {
  private userStore: OfflineUserStore

  constructor(userStore: OfflineUserStore) {
    this.userStore = userStore
  }

  async getUsers(): Promise<UserSummary[]> {
    return [this.userStore.getUser()]
  }
}