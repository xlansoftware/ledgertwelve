import { create } from 'zustand'
import * as api from '@/services/api'

interface UserState {
  user: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  whoami: () => Promise<void>
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (username: string, password: string) => {
    await api.login({ user: username, password })
    set({ user: username, isAuthenticated: true })
  },

  logout: async () => {
    await api.logout()
    set({ user: null, isAuthenticated: false })
  },

  whoami: async () => {
    try {
      const res = await api.whoami()
      const isAuth = res.user !== 'anonymous'
      set({ user: isAuth ? res.user : null, isAuthenticated: isAuth })
    } catch {
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  },
}))
