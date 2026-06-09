// ---------------------------------------------------------------------------
// API response envelope — every endpoint wraps data in { data, meta? }
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T
}

export interface ApiPaginatedResponse<T> extends ApiResponse<T> {
  meta: {
    page: number
    pageSize: number
    total: number
  }
}

export interface ApiError {
  error: string
}

export interface DeleteResponse {
  deleted: true
}

export interface ReassignResponse {
  reassignedTransactions: number
}

export interface BulkReassignResponse {
  affectedTransactions: number
}

export interface CloseBookResponse {
  bookId: string
  status: "closed"
  closingTransactionId: string
  netBalance: number
}

export interface ReopenBookResponse {
  bookId: string
  status: "open"
}

export interface ShareResponse {
  userId: string
  permission: "view" | "edit"
}