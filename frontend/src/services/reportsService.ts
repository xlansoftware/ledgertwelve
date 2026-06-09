import { request } from "./api"
import type { ApiResponse, TotalsReportRow, CategoryReportRow } from "@/types"

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