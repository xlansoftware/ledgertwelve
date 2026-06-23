// ---------------------------------------------------------------------------
// Auth store — single source of truth for authentication state
// ---------------------------------------------------------------------------

import { create } from "zustand"
import { login as apiLogin, logout as apiLogout, whoami } from "@/services/authService"
import type { UserSummary } from "@/types"

// ---- State shape ----

export type AuthState =
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: UserSummary }
  | { status: "local" }

interface AuthStore {
  state: AuthState
  isAuthenticated: boolean

  /** Log in with email + password using the API — on success sets `authenticated`. */
  login: (email: string, password: string) => Promise<void>

  /** Log out via API — sets `unauthenticated` and navigates to /login. */
  logout: () => Promise<void>

  /** Check for an existing session via whoami(). */
  checkSession: () => Promise<void>

  /** Set local (offline / demo) mode. */
  setLocalMode: () => void

  /** Internal helpers used by main.tsx bootstrap. */
  _setAuthenticated: (user: UserSummary) => void
  _setUnauthenticated: () => void
}

// ---- Store ----

export const useAuthStore = create<AuthStore>((set) => ({
  state: { status: "unauthenticated" },
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const user = await apiLogin({ email, password })
    set({ state: { status: "authenticated", user }, isAuthenticated: true })
  },

  logout: async () => {
    try {
      await apiLogout()
    } catch {
      // Even if the server call fails, clear local state
    }
    set({ state: { status: "unauthenticated" }, isAuthenticated: false })
  },

  checkSession: async () => {
    try {
      const user = await whoami()
      set({ state: { status: "authenticated", user }, isAuthenticated: true })
    } catch {
      set({ state: { status: "unauthenticated" }, isAuthenticated: false })
    }
  },

  setLocalMode: () => {
    // For now, local mode just uses the hardcoded demo user
    // Real offline mode is a future feature
    set({
      state: { status: "local" },
      isAuthenticated: true,
    })
  },

  _setAuthenticated: (user: UserSummary) => {
    set({ state: { status: "authenticated", user }, isAuthenticated: true })
  },

  _setUnauthenticated: () => {
    set({ state: { status: "unauthenticated" }, isAuthenticated: false })
  },
}))
