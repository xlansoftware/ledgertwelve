import type { Transaction, DashboardAggregate } from './models'

// ---------------------------------------------------------------------------
// Generic wrappers
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

export interface ApiErrorResponse {
  error: string
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface LoginRequest {
  user: string
  password: string
}

export interface LoginResponse {
  message: string
}

export interface LogoutResponse {
  message: string
}

export interface WhoamiResponse {
  user: string
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export interface TransactionFilters {
  page?: number
  pageSize?: number
  book?: string
  author?: string
  category?: string
  currency?: string
}

export type TransactionListResponse = PaginatedResponse<Transaction>

export interface CreateTransactionRequest {
  value: number
  currency: string
  category: string
  author?: string
  book?: string | null
  date?: string
}

export interface UpdateTransactionRequest {
  value: number
  currency: string
  category: string
  author: string
  book?: string | null
  date: string
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardFilters {
  granularity: 'daily' | 'weekly' | 'monthly' | 'yearly'
  from?: string
  to?: string
  book?: string
  author?: string
  category?: string
  currency?: string
  page?: number
  pageSize?: number
}

export type DashboardResponse = PaginatedResponse<DashboardAggregate>