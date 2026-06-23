// ---------------------------------------------------------------------------
// OnlineReportsService — delegates to the existing API-based reportsService
// ---------------------------------------------------------------------------

import * as reportsService from "@/services/reportsService"
import type { IReportsService, GetTotalsParams, GetCategoryReportParams, GetDailyReportParams, GetMonthlyReportParams, GetAverageParams } from "@/features/offline/interfaces/IReportsService"
import type { TotalsReportRow, CategoryReportRow, DailyReportRow, MonthlyReportRow, AverageReportDto } from "@/types"

export class OnlineReportsService implements IReportsService {
  async getTotals(params?: GetTotalsParams): Promise<TotalsReportRow[]> {
    return reportsService.getTotals(params)
  }

  async getCategoryReport(params?: GetCategoryReportParams): Promise<CategoryReportRow[]> {
    return reportsService.getCategoryReport(params)
  }

  async getDailyReport(params: GetDailyReportParams): Promise<DailyReportRow[]> {
    return reportsService.getDailyReport(params)
  }

  async getMonthlyReport(params: GetMonthlyReportParams): Promise<MonthlyReportRow[]> {
    return reportsService.getMonthlyReport(params)
  }

  async getDailyAverage(params: GetAverageParams): Promise<AverageReportDto> {
    return reportsService.getDailyAverage(params)
  }

  async getMonthlyAverage(params: GetAverageParams): Promise<AverageReportDto> {
    return reportsService.getMonthlyAverage(params)
  }
}