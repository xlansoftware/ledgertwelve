// ---------------------------------------------------------------------------
// ITransactionsService — interface for transactions domain operations
// ---------------------------------------------------------------------------

import type { TransactionDto } from "@/types"

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

export interface ITransactionsService {
  getTransactions(params?: GetTransactionsParams): Promise<PaginatedTransactions>
  getTransaction(transactionId: string): Promise<TransactionDto>
  createTransaction(req: CreateTransactionRequest): Promise<TransactionDto>
  updateTransaction(transactionId: string, req: UpdateTransactionRequest): Promise<TransactionDto>
  deleteTransaction(transactionId: string): Promise<void>
}