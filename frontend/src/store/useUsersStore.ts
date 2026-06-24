import { create } from "zustand"
import type { UserSummary } from "@/types"
import { getFactory } from "@/features/offline"

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
  addGlobalShare: (email: string) => Promise<void>
  removeGlobalShare: (userId: string) => Promise<void>
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
      const data = await getFactory().users.getUsers()
      set({ users: data, isLoading: false })
      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load users"
      set({ error: message, isLoading: false })
      throw err
    }
  },

  addGlobalShare: async (email: string) => {
    set({ error: null })
    try {
      await getFactory().books.addGlobalShare(email)
      // Refresh the users list to reflect the new share
      await useUsersStore.getState().fetchUsers()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add share"
      set({ error: message })
      throw err
    }
  },

  removeGlobalShare: async (userId: string) => {
    set({ error: null })
    try {
      await getFactory().books.removeGlobalShare(userId)
      // Refresh the users list to reflect the removed share
      await useUsersStore.getState().fetchUsers()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove share"
      set({ error: message })
      throw err
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))