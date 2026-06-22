import { request } from "./api"
import type { ApiResponse, TotalsReportRow, CategoryReportRow, DailyReportRow, MonthlyReportRow } from "@/types"

// ---------------------------------------------------------------------------
// GET   /api/v1/reports/totals
// ---------------------------------------------------------------------------

export interface GetTotalsParams {
  period?: "day" | "week" | "month" | "year"
  from?: string
  to?: string
}

export async function getTotals(params: GetTotalsParams = {}): Promise<TotalsReportRow[]> {
  const res = await request<ApiResponse<TotalsReportRow[]>>("/api/v1/reports/totals", {
    params: {
      period: params.period,
      from: params.from,
      to: params.to,
    },
  })
  return res.data
}

// ---------------------------------------------------------------------------
// GET   /api/v1/reports/categories
// ---------------------------------------------------------------------------

export interface GetCategoryReportParams {
  from?: string
  to?: string
}

export async function getCategoryReport(
  params: GetCategoryReportParams = {},
): Promise<CategoryReportRow[]> {
  const res = await request<ApiResponse<CategoryReportRow[]>>(
    "/api/v1/reports/categories",
    { params: { from: params.from, to: params.to } },
  )
  return res.data
}

// ---------------------------------------------------------------------------
// GET   /api/v1/reports/daily
// ---------------------------------------------------------------------------

export interface GetDailyReportParams {
  from: string
  to: string
}

export async function getDailyReport(
  params: GetDailyReportParams,
): Promise<DailyReportRow[]> {
  const res = await request<ApiResponse<DailyReportRow[]>>(
    "/api/v1/reports/daily",
    { params: { from: params.from, to: params.to } },
  )
  return res.data
}

// ---------------------------------------------------------------------------
// GET   /api/v1/reports/monthly
// ---------------------------------------------------------------------------

export interface GetMonthlyReportParams {
  from: string
  to: string
}

export async function getMonthlyReport(
  params: GetMonthlyReportParams,
): Promise<MonthlyReportRow[]> {
  const res = await request<ApiResponse<MonthlyReportRow[]>>(
    "/api/v1/reports/monthly",
    { params: { from: params.from, to: params.to } },
  )
  return res.data
}