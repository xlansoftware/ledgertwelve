// ---------------------------------------------------------------------------
// IReportsService — interface for reports domain operations
// ---------------------------------------------------------------------------

import type {
  TotalsReportRow,
  CategoryReportRow,
  DailyReportRow,
  MonthlyReportRow,
  AverageReportDto,
} from "@/types"

export interface GetTotalsParams {
  period?: "day" | "week" | "month" | "year"
  from?: string
  to?: string
  bookId?: string
}

export interface GetCategoryReportParams {
  from?: string
  to?: string
  bookId?: string
}

export interface GetDailyReportParams {
  from: string
  to: string
  bookId?: string
}

export interface GetMonthlyReportParams {
  from: string
  to: string
  bookId?: string
}

export interface GetAverageParams {
  from: string
  to: string
  bookId?: string
}

export interface IReportsService {
  getTotals(params?: GetTotalsParams): Promise<TotalsReportRow[]>
  getCategoryReport(params?: GetCategoryReportParams): Promise<CategoryReportRow[]>
  getDailyReport(params: GetDailyReportParams): Promise<DailyReportRow[]>
  getMonthlyReport(params: GetMonthlyReportParams): Promise<MonthlyReportRow[]>
  getDailyAverage(params: GetAverageParams): Promise<AverageReportDto>
  getMonthlyAverage(params: GetAverageParams): Promise<AverageReportDto>
}