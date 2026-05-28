import type {
  BookListResponse,
  CategoryListResponse,
  CreateBookRequest,
  CreateCategoryRequest,
  CreateTransactionRequest,
  DashboardFilters,
  DashboardResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  TransactionFilters,
  TransactionListResponse,
  UpdateBookRequest,
  UpdateCategoryRequest,
  UpdateTransactionRequest,
  WhoamiResponse,
} from '@/types/api.types'
import type { Book, Transaction } from '@/types/models'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(
      (body as Record<string, unknown>).error as string ?? `Request failed with status ${res.status}`,
      res.status,
    )
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Query-string builder
// ---------------------------------------------------------------------------

function buildQuery(params: object): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  )
  if (entries.length === 0) return ''
  const qs = new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)]),
  ).toString()
  return `?${qs}`
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export function login(data: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function logout(): Promise<LogoutResponse> {
  return request<LogoutResponse>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function whoami(): Promise<WhoamiResponse> {
  return request<WhoamiResponse>('/auth/whoami')
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export function getTransactions(
  filters?: TransactionFilters,
): Promise<TransactionListResponse> {
  return request<TransactionListResponse>(
    `/ledger/transactions${buildQuery(filters ?? {})}`,
  )
}

export function getTransaction(id: string): Promise<Transaction> {
  return request<Transaction>(`/ledger/transactions/${encodeURIComponent(id)}`)
}

export function createTransaction(
  data: CreateTransactionRequest,
): Promise<Transaction> {
  return request<Transaction>('/ledger/transaction', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateTransaction(
  id: string,
  data: UpdateTransactionRequest,
): Promise<Transaction> {
  return request<Transaction>(`/ledger/transactions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteTransaction(id: string): Promise<void> {
  return request<void>(`/ledger/transactions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// ---------------------------------------------------------------------------
// Books
// ---------------------------------------------------------------------------

export function getBooks(): Promise<BookListResponse> {
  return request<BookListResponse>('/books')
}

export function createBook(
  data: CreateBookRequest,
): Promise<Book> {
  return request<Book>('/books', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateBook(
  id: string,
  data: UpdateBookRequest,
): Promise<Book> {
  return request<Book>(`/books/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteBook(id: string): Promise<void> {
  return request<void>(`/books/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export function getCategories(): Promise<CategoryListResponse> {
  return request<CategoryListResponse>('/categories')
}

export function createCategory(
  data: CreateCategoryRequest,
): Promise<CategoryListResponse[number]> {
  return request<CategoryListResponse[number]>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateCategory(
  id: string,
  data: UpdateCategoryRequest,
): Promise<CategoryListResponse[number]> {
  return request<CategoryListResponse[number]>(
    `/categories/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
  )
}

export function deleteCategory(id: string): Promise<void> {
  return request<void>(`/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function getDashboard(
  filters: DashboardFilters,
): Promise<DashboardResponse> {
  return request<DashboardResponse>(
    `/dashboard${buildQuery(filters)}`,
  )
}