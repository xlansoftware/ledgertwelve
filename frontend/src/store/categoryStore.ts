import { create } from 'zustand'
import type { CreateCategoryRequest, UpdateCategoryRequest } from '@/types/api.types'
import type { Category } from '@/types/models'
import * as api from '@/services/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryState {
  categories: Category[]
  isLoading: boolean
  error: string | null
  hasLoadedOnce: boolean

  fetchCategories: () => Promise<void>
  ensureLoaded: () => Promise<void>
  createCategory: (data: CreateCategoryRequest) => Promise<void>
  updateCategory: (id: string, data: UpdateCategoryRequest) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let fetchSeq = 0

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,
  hasLoadedOnce: false,

  // -----------------------------------------------------------------------
  // fetchCategories
  // -----------------------------------------------------------------------

  fetchCategories: async () => {
    const seq = ++fetchSeq
    set({ isLoading: true, error: null })

    try {
      const data = await api.getCategories()

      // Guard against stale responses from rapid calls
      if (seq !== fetchSeq) return

      set({ categories: data, isLoading: false, hasLoadedOnce: true })
    } catch (err: unknown) {
      if (seq !== fetchSeq) return

      const message =
        err instanceof api.ApiError
          ? err.message
          : 'Failed to load categories.'
      set({ error: message, isLoading: false, hasLoadedOnce: true })
    }
  },

  // -----------------------------------------------------------------------
  // ensureLoaded — fetch only if never loaded before
  // -----------------------------------------------------------------------

  ensureLoaded: async () => {
    const state = get()

    // Already fetched at least once — nothing to do
    if (state.hasLoadedOnce) return

    // A fetch is in flight — wait for it to settle
    if (state.isLoading) {
      return new Promise<void>((resolve) => {
        const unsub = useCategoryStore.subscribe((s) => {
          if (!s.isLoading) {
            unsub()
            resolve()
          }
        })
      })
    }

    // Never fetched — trigger load
    await get().fetchCategories()
  },

  // -----------------------------------------------------------------------
  // createCategory — append optimistically, then re-fetch
  // -----------------------------------------------------------------------

  createCategory: async (data: CreateCategoryRequest) => {
    set({ error: null })

    try {
      await api.createCategory(data)
    } catch (err: unknown) {
      const message =
        err instanceof api.ApiError
          ? err.message
          : 'Failed to create category.'
      set({ error: message })
      return
    }

    await get().fetchCategories()
  },

  // -----------------------------------------------------------------------
  // updateCategory — optimistic update, then re-fetch
  // -----------------------------------------------------------------------

  updateCategory: async (id: string, data: UpdateCategoryRequest) => {
    set({ error: null })

    // Optimistic update
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...data } : c,
      ),
    }))

    try {
      await api.updateCategory(id, data)
    } catch (err: unknown) {
      const message =
        err instanceof api.ApiError
          ? err.message
          : 'Failed to update category.'
      set({ error: message })
    }

    // Re-fetch to reconcile with server
    await get().fetchCategories()
  },

  // -----------------------------------------------------------------------
  // deleteCategory — optimistic removal, then re-fetch
  // -----------------------------------------------------------------------

  deleteCategory: async (id: string) => {
    set({ error: null })

    // Optimistic removal
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    }))

    try {
      await api.deleteCategory(id)
    } catch (err: unknown) {
      const message =
        err instanceof api.ApiError
          ? err.message
          : 'Failed to delete category.'
      set({ error: message })
    }

    // Re-fetch to reconcile with server
    await get().fetchCategories()
  },
}))
