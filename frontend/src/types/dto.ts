// ---------------------------------------------------------------------------
// DTOs — shapes returned by the API (source of truth: API.md)
// ---------------------------------------------------------------------------

export interface UserSummary {
  id: string
  email: string
}

export interface CategoryDto {
  id: string
  name: string
  recurring?: boolean
  color?: string
  icon?: string
  createdAt?: string
  order?: number
}

export interface SharedUserDto {
  userId: string
  email: string
  permission: "view" | "edit"
}

export interface BookDto {
  id: string
  name: string
  currency?: string
  status: "open" | "closed"
  ownerId: string
  sharedWith: SharedUserDto[]
  createdAt: string
  closedAt?: string | null
}

export interface TransactionDto {
  id: string
  bookId: string
  userId: string
  dateTime: string
  amount: number
  originalCurrency?: string
  originalAmount?: number
  exchangeRate?: number
  categoryName?: string
  note?: string
  createdAt: string
  isBookClosingEntry?: boolean
  closedBookId?: string
}

export interface ExportJobDto {
  jobId: string
  status: "pending" | "processing" | "completed" | "failed"
  downloadUrl?: string
  errorMessage?: string
}

// Report DTOs

export interface TotalsReportRow {
  period: string
  income: number
  expense: number
  net: number
}

export interface CategoryReportRow {
  categoryName: string
  amount: number
}

export interface DailyReportRow {
  date: string   // "YYYY-MM-DD"
  amount: number
}

export interface MonthlyReportRow {
  period: string   // "YYYY-MM"
  amount: number
}

export interface ExchangeRateDto {
  from: string
  to: string
  rate: number
}

export interface BookStatsDto {
  transactionCount: number
  totalSum: number
}

export interface AverageReportDto {
  average: number
  count: number
}