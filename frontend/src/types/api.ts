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

export interface ReorderCategoriesResponse {
  success: true
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

export interface FilterRequest {
  period?: 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom';
  startDate?: string;      // ISO 8601 string, e.g., "2025-05-29"
  endDate?: string;        // ISO 8601 string
  category?: string[];
  note?: string;
  user?: string[];
  minValue?: number;
  maxValue?: number;
}
