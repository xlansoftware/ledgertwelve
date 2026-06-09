import { request } from "./api"
import type {
  ApiResponse,
  CategoryDto,
  DeleteResponse,
  BulkReassignResponse,
} from "@/types"

// ---------------------------------------------------------------------------
// GET   /api/v1/categories
// ---------------------------------------------------------------------------

export async function getCategories(): Promise<CategoryDto[]> {
  const res = await request<ApiResponse<CategoryDto[]>>("/api/v1/categories")
  return res.data
}

// ---------------------------------------------------------------------------
// POST  /api/v1/categories
// ---------------------------------------------------------------------------

export interface CreateCategoryRequest {
  name: string
  recurring?: boolean
  color?: string
  icon?: string
  order?: number
}

export async function createCategory(req: CreateCategoryRequest): Promise<CategoryDto> {
  const res = await request<ApiResponse<CategoryDto>>("/api/v1/categories", {
    method: "POST",
    body: req,
  })
  return res.data
}

// ---------------------------------------------------------------------------
// PUT   /api/v1/categories/{categoryId}
// ---------------------------------------------------------------------------

export interface UpdateCategoryRequest {
  name?: string
  recurring?: boolean
  color?: string
  icon?: string
  order?: number
}

export async function updateCategory(
  categoryId: string,
  req: UpdateCategoryRequest,
): Promise<CategoryDto> {
  const res = await request<ApiResponse<CategoryDto>>(
    `/api/v1/categories/${categoryId}`,
    { method: "PUT", body: req },
  )
  return res.data
}

// ---------------------------------------------------------------------------
// DELETE  /api/v1/categories/{categoryId}
// ---------------------------------------------------------------------------

export interface DeleteCategoryParams {
  replacementCategoryName?: string
}

export async function deleteCategory(
  categoryId: string,
  params?: DeleteCategoryParams,
): Promise<DeleteResponse & { reassignedTransactions: number }> {
  const res = await request<ApiResponse<DeleteResponse & { reassignedTransactions: number }>>(
    `/api/v1/categories/${categoryId}`,
    { method: "DELETE", params: { replacementCategoryName: params?.replacementCategoryName } },
  )
  return res.data
}

// ---------------------------------------------------------------------------
// POST  /api/v1/categories/reassign
// ---------------------------------------------------------------------------

export interface ReassignCategoriesRequest {
  fromCategoryName: string
  toCategoryName: string
}

export async function reassignCategories(
  req: ReassignCategoriesRequest,
): Promise<BulkReassignResponse> {
  const res = await request<ApiResponse<BulkReassignResponse>>("/api/v1/categories/reassign", {
    method: "POST",
    body: req,
  })
  return res.data
}