// ---------------------------------------------------------------------------
// OfflineCategoriesService — IndexedDB-backed implementation of ICategoriesService
// ---------------------------------------------------------------------------

import type { CategoryDto, BulkReassignResponse, ReorderCategoriesResponse } from "@/types"
import type { ICategoriesService, CreateCategoryRequest, UpdateCategoryRequest, DeleteCategoryParams, ReassignCategoriesRequest, ReorderCategoriesRequest } from "@/features/offline/interfaces/ICategoriesService"
import * as db from "./db"

export class OfflineCategoriesService implements ICategoriesService {
  constructor() {}

  async getCategories(): Promise<CategoryDto[]> {
    const all = await db.getAll<CategoryDto>(db.STORES.categories)
    // Sort by order if present, then by name
    return all.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order
      }
      return a.name.localeCompare(b.name)
    })
  }

  async createCategory(req: CreateCategoryRequest): Promise<CategoryDto> {
    const now = new Date().toISOString()
    const category: CategoryDto = {
      id: crypto.randomUUID(),
      name: req.name,
      recurring: req.recurring ?? false,
      color: req.color ?? "#000000",
      icon: req.icon ?? "question",
      createdAt: now,
      order: req.order,
    }
    await db.put(db.STORES.categories, category)
    return category
  }

  async updateCategory(categoryId: string, req: UpdateCategoryRequest): Promise<CategoryDto> {
    const cat = await db.getById<CategoryDto>(db.STORES.categories, categoryId)
    if (!cat) {
      throw new Error("Category not found")
    }
    const updated: CategoryDto = {
      ...cat,
      ...(req.name !== undefined ? { name: req.name } : {}),
      ...(req.recurring !== undefined ? { recurring: req.recurring } : {}),
      ...(req.color !== undefined ? { color: req.color } : {}),
      ...(req.icon !== undefined ? { icon: req.icon } : {}),
      ...(req.order !== undefined ? { order: req.order } : {}),
    }
    await db.put(db.STORES.categories, updated)
    return updated
  }

  async deleteCategory(categoryId: string, params?: DeleteCategoryParams): Promise<{ reassignedTransactions: number }> {
    const cat = await db.getById<CategoryDto>(db.STORES.categories, categoryId)
    if (!cat) {
      throw new Error("Category not found")
    }

    let reassignedCount = 0

    if (params?.replacementCategoryName) {
      // Reassign transactions from this category to the replacement
      const allTxs = await db.getAll<{ id: string; bookId: string; userId: string; dateTime: string; amount: number; categoryName?: string; note?: string; createdAt: string; isBookClosingEntry?: boolean; closedBookId?: string }>(db.STORES.transactions)
      for (const tx of allTxs) {
        if (tx.categoryName === cat.name) {
          tx.categoryName = params.replacementCategoryName
          await db.put(db.STORES.transactions, tx)
          reassignedCount++
        }
      }
    }

    await db.remove(db.STORES.categories, categoryId)
    return { reassignedTransactions: reassignedCount }
  }

  async reassignCategories(req: ReassignCategoriesRequest): Promise<BulkReassignResponse> {
    let affectedTransactions = 0
    const allTxs = await db.getAll<{ id: string; bookId: string; userId: string; dateTime: string; amount: number; categoryName?: string; note?: string; createdAt: string; isBookClosingEntry?: boolean; closedBookId?: string }>(db.STORES.transactions)
    for (const tx of allTxs) {
      if (tx.categoryName === req.fromCategoryName) {
        tx.categoryName = req.toCategoryName
        await db.put(db.STORES.transactions, tx)
        affectedTransactions++
      }
    }
    return { affectedTransactions }
  }

  async reorderCategories(req: ReorderCategoriesRequest): Promise<ReorderCategoriesResponse> {
    const allCats = await db.getAll<CategoryDto>(db.STORES.categories)
    const idToOrder = new Map(req.orderedIds.map((id, idx) => [id, idx + 1]))

    for (const cat of allCats) {
      const newOrder = idToOrder.get(cat.id)
      if (newOrder !== undefined) {
        cat.order = newOrder
        await db.put(db.STORES.categories, cat)
      }
    }

    return { success: true }
  }
}