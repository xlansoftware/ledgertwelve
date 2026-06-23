// ---------------------------------------------------------------------------
// IUsersService — interface for users domain operations
// ---------------------------------------------------------------------------

import type { UserSummary } from "@/types"

export interface IUsersService {
  getUsers(): Promise<UserSummary[]>
}