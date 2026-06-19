import { request } from "./api"
import type { ApiResponse, ApiPaginatedResponse, TransactionDto, DeleteResponse } from "@/types"

// ---------------------------------------------------------------------------
// GET   /api/v1/transactions
// ---------------------------------------------------------------------------

export interface GetTransactionsParams {
  bookId?: string
  from?: string
  to?: string
  category?: string[]
  createdBy?: string[]
  note?: string
  minValue?: number
  maxValue?: number
  page?: number
  pageSize?: number
}

export interface PaginatedTransactions {
  items: TransactionDto[]
  page: number
  pageSize: number
  total: number
}

export async function getTransactions(
  params: GetTransactionsParams = {},
): Promise<PaginatedTransactions> {
  const res = await request<ApiPaginatedResponse<TransactionDto[]>>("/api/v1/transactions", {
    params: {
      bookId: params.bookId,
      from: params.from,
      to: params.to,
      category: params.category,
      createdBy: params.createdBy,
      note: params.note,
      minValue: params.minValue,
      maxValue: params.maxValue,
      page: params.page,
      pageSize: params.pageSize,
    },
  })
  return {
    items: res.data,
    page: res.meta.page,
    pageSize: res.meta.pageSize,
    total: res.meta.total,
  }
}

// ---------------------------------------------------------------------------
// GET   /api/v1/transactions/{transactionId}
// ---------------------------------------------------------------------------

export async function getTransaction(transactionId: string): Promise<TransactionDto> {
  const res = await request<ApiResponse<TransactionDto>>(
    `/api/v1/transactions/${transactionId}`,
  )
  return res.data
}

// ---------------------------------------------------------------------------
// POST  /api/v1/transactions
// ---------------------------------------------------------------------------

export interface CreateTransactionRequest {
  bookId: string
  dateTime?: string
  amount: number
  originalCurrency?: string
  originalAmount?: number
  exchangeRate?: number
  categoryName?: string
  note?: string
}

export async function createTransaction(
  req: CreateTransactionRequest,
): Promise<TransactionDto> {
  const res = await request<ApiResponse<TransactionDto>>("/api/v1/transactions", {
    method: "POST",
    body: req,
  })
  return res.data
}

// ---------------------------------------------------------------------------
// PUT   /api/v1/transactions/{transactionId}
// ---------------------------------------------------------------------------

export interface UpdateTransactionRequest {
  bookId?: string
  dateTime?: string
  amount?: number
  originalCurrency?: string
  originalAmount?: number
  exchangeRate?: number
  categoryName?: string
  note?: string
}

export async function updateTransaction(
  transactionId: string,
  req: UpdateTransactionRequest,
): Promise<TransactionDto> {
  const res = await request<ApiResponse<TransactionDto>>(
    `/api/v1/transactions/${transactionId}`,
    { method: "PUT", body: req },
  )
  return res.data
}

// ---------------------------------------------------------------------------
// DELETE  /api/v1/transactions/{transactionId}
// ---------------------------------------------------------------------------

export async function deleteTransaction(transactionId: string): Promise<void> {
  await request<ApiResponse<DeleteResponse>>(
    `/api/v1/transactions/${transactionId}`,
    { method: "DELETE" },
  )
}