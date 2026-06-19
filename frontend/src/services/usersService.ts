// ---------------------------------------------------------------------------
// GET   /api/v1/users
// ---------------------------------------------------------------------------

import { request } from "./api"
import type { ApiResponse, UserSummary } from "@/types"

export async function getUsers(): Promise<UserSummary[]> {
  const res = await request<ApiResponse<UserSummary[]>>("/api/v1/users")
  return res.data
}