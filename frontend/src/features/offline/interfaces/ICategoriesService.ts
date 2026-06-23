// ---------------------------------------------------------------------------
// ICategoriesService — interface for categories domain operations
// ---------------------------------------------------------------------------

import type { CategoryDto, BulkReassignResponse, ReorderCategoriesResponse } from "@/types"

export interface CreateCategoryRequest {
  name: string
  recurring?: boolean
  color?: string
  icon?: string
  order?: number
}

export interface UpdateCategoryRequest {
  name?: string
  recurring?: boolean
  color?: string
  icon?: string
  order?: number
}

export interface DeleteCategoryParams {
  replacementCategoryName?: string
}

export interface ReassignCategoriesRequest {
  fromCategoryName: string
  toCategoryName: string
}

export interface ReorderCategoriesRequest {
  orderedIds: string[]
}

export interface ICategoriesService {
  getCategories(): Promise<CategoryDto[]>
  createCategory(req: CreateCategoryRequest): Promise<CategoryDto>
  updateCategory(categoryId: string, req: UpdateCategoryRequest): Promise<CategoryDto>
  deleteCategory(categoryId: string, params?: DeleteCategoryParams): Promise<{ reassignedTransactions: number }>
  reassignCategories(req: ReassignCategoriesRequest): Promise<BulkReassignResponse>
  reorderCategories(req: ReorderCategoriesRequest): Promise<ReorderCategoriesResponse>
}