import { create } from "zustand"
import type { CategoryDto } from "@/types"
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reassignCategories,
} from "@/services"
import type {
  CreateCategoryRequest,
  UpdateCategoryRequest,
  DeleteCategoryParams,
  ReassignCategoriesRequest,
} from "@/services"

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface CategoriesState {
  /** The list of categories for the current user. */
  categories: CategoryDto[]
  /** Whether a fetch is in progress. */
  isLoading: boolean
  /** Human-readable error message, or null. */
  error: string | null
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

interface CategoriesActions {
  /** Fetch all categories from the API. */
  fetchCategories: () => Promise<CategoryDto[]>
  /** Create a new category and optimistically add it to state. */
  createCategory: (req: CreateCategoryRequest) => Promise<CategoryDto>
  /** Update an existing category and optimistically update state. */
  updateCategory: (categoryId: string, req: UpdateCategoryRequest) => Promise<CategoryDto>
  /** Delete a category and optimistically remove it from state. */
  deleteCategory: (categoryId: string, params?: DeleteCategoryParams) => Promise<void>
  /** Bulk-reassign transactions from one category to another, then refetch. */
  reassignCategories: (req: ReassignCategoriesRequest) => Promise<void>
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCategoriesStore = create<CategoriesState & CategoriesActions>((set, get) => ({
  // -- State --
  categories: [],
  isLoading: false,
  error: null,

  // -- Actions --

  fetchCategories: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await getCategories()
      set({ categories: data, isLoading: false })
      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load categories"
      set({ error: message, isLoading: false })
      throw err
    }
  },

  createCategory: async (req: CreateCategoryRequest) => {
    set({ error: null })
    try {
      const created = await createCategory(req)
      set((state) => ({ categories: [...state.categories, created] }))
      return created
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create category"
      set({ error: message })
      throw err
    }
  },

  updateCategory: async (categoryId: string, req: UpdateCategoryRequest) => {
    set({ error: null })
    // Optimistic update
    const previous = get().categories
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === categoryId ? { ...c, ...req } : c,
      ),
    }))
    try {
      const updated = await updateCategory(categoryId, req)
      set((state) => ({
        categories: state.categories.map((c) => (c.id === categoryId ? updated : c)),
      }))
      return updated
    } catch (err: unknown) {
      // Revert on failure
      set({ categories: previous, error: err instanceof Error ? err.message : "Failed to update category" })
      throw err
    }
  },

  deleteCategory: async (categoryId: string, params?: DeleteCategoryParams) => {
    set({ error: null })
    const previous = get().categories
    // Optimistic removal
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== categoryId),
    }))
    try {
      await deleteCategory(categoryId, params)
    } catch (err: unknown) {
      set({ categories: previous, error: err instanceof Error ? err.message : "Failed to delete category" })
      throw err
    }
  },

  reassignCategories: async (req: ReassignCategoriesRequest) => {
    set({ error: null })
    try {
      await reassignCategories(req)
      // Refresh the full list since the reassignment may have changed categories
      await get().fetchCategories()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reassign categories"
      set({ error: message })
      throw err
    }
  },
}))