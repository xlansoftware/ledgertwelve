import { create } from "zustand"
import type { UserSummary } from "@/types"
import { getUsers } from "@/services"

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface UsersState {
  users: UserSummary[]
  isLoading: boolean
  error: string | null
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface UsersActions {
  fetchUsers: () => Promise<UserSummary[]>
  clearError: () => void
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUsersStore = create<UsersState & UsersActions>((set) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await getUsers()
      set({ users: data, isLoading: false })
      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load users"
      set({ error: message, isLoading: false })
      throw err
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))