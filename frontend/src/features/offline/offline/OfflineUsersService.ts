// ---------------------------------------------------------------------------
// OfflineUsersService — returns the single local user
// ---------------------------------------------------------------------------

import type { UserSummary } from "@/types"
import type { IUsersService } from "@/features/offline/interfaces/IUsersService"

export class OfflineUsersService implements IUsersService {
  private userStore: IUsersService

  constructor(userStore: IUsersService) {
    this.userStore = userStore
  }

  async getUsers(): Promise<UserSummary[]> {
    return this.userStore.getUsers()
  }
}