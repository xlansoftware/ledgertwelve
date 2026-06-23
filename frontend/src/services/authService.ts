import { request } from "./api"
import type { ApiResponse, UserSummary } from "@/types"

// ---------------------------------------------------------------------------
// POST  /api/v1/auth/login
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string
  password: string
}

export async function login(req: LoginRequest): Promise<UserSummary> {
  const res = await request<ApiResponse<UserSummary>>("/api/v1/auth/login", {
    method: "POST",
    body: req,
  })
  return res.data
}

// ---------------------------------------------------------------------------
// GET   /api/v1/auth/whoami
// ---------------------------------------------------------------------------

export async function whoami(): Promise<UserSummary> {
  const res = await request<ApiResponse<UserSummary>>("/api/v1/auth/whoami")
  return res.data
}

// ---------------------------------------------------------------------------
// POST  /api/v1/auth/logout
// ---------------------------------------------------------------------------

export async function logout(): Promise<void> {
  await request<ApiResponse<{ success: boolean }>>("/api/v1/auth/logout", {
    method: "POST",
  })
}