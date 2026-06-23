// ---------------------------------------------------------------------------
// OnlineCategoriesService — delegates to the existing API-based categoriesService
// ---------------------------------------------------------------------------

import * as categoriesService from "@/services/categoriesService"
import type { ICategoriesService, CreateCategoryRequest, UpdateCategoryRequest, DeleteCategoryParams, ReassignCategoriesRequest, ReorderCategoriesRequest } from "@/features/offline/interfaces/ICategoriesService"
import type { CategoryDto, BulkReassignResponse, ReorderCategoriesResponse } from "@/types"

export class OnlineCategoriesService implements ICategoriesService {
  async getCategories(): Promise<CategoryDto[]> {
    return categoriesService.getCategories()
  }

  async createCategory(req: CreateCategoryRequest): Promise<CategoryDto> {
    return categoriesService.createCategory(req)
  }

  async updateCategory(categoryId: string, req: UpdateCategoryRequest): Promise<CategoryDto> {
    return categoriesService.updateCategory(categoryId, req)
  }

  async deleteCategory(categoryId: string, params?: DeleteCategoryParams): Promise<{ reassignedTransactions: number }> {
    return categoriesService.deleteCategory(categoryId, params)
  }

  async reassignCategories(req: ReassignCategoriesRequest): Promise<BulkReassignResponse> {
    return categoriesService.reassignCategories(req)
  }

  async reorderCategories(req: ReorderCategoriesRequest): Promise<ReorderCategoriesResponse> {
    return categoriesService.reorderCategories(req)
  }
}