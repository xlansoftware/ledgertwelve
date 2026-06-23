// ---------------------------------------------------------------------------
// OnlineUsersService — delegates to the existing API-based usersService
// ---------------------------------------------------------------------------

import * as usersService from "@/services/usersService"
import type { IUsersService } from "@/features/offline/interfaces/IUsersService"
import type { UserSummary } from "@/types"

export class OnlineUsersService implements IUsersService {
  async getUsers(): Promise<UserSummary[]> {
    return usersService.getUsers()
  }
}