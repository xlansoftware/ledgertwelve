// ---------------------------------------------------------------------------
// OfflineReportsService — IndexedDB-backed implementation of IReportsService
//
// All report endpoints recompute from scratch on every call by pulling
// relevant transactions from IndexedDB, grouping/summing/averaging in memory.
// Uses Main book only, per the API contract.
// ---------------------------------------------------------------------------

import type { TotalsReportRow, CategoryReportRow, DailyReportRow, MonthlyReportRow, AverageReportDto, TransactionDto } from "@/types"
import type { IReportsService, GetTotalsParams, GetCategoryReportParams, GetDailyReportParams, GetMonthlyReportParams, GetAverageParams } from "@/features/offline/interfaces/IReportsService"
import * as db from "./db"

export class OfflineReportsService implements IReportsService {
  /**
   * Get all transactions for the Main book within the given date range.
   */
  private async getMainBookTransactions(from?: string, to?: string): Promise<TransactionDto[]> {
    const allBooks = await db.getAll<{ id: string; name: string }>(db.STORES.books)
    const mainBook = allBooks.find((b) => b.name === "Main")
    if (!mainBook) {
      throw new Error("Main book not found")
    }

    const allTxs = await db.getAllByIndex<TransactionDto>(db.STORES.transactions, "bookId", mainBook.id)

    let filtered = allTxs.filter((tx) => !tx.isBookClosingEntry)

    if (from) {
      const fromDate = new Date(from + "T00:00:00.000Z")
      filtered = filtered.filter((tx) => new Date(tx.dateTime) >= fromDate)
    }
    if (to) {
      const toDate = new Date(to + "T00:00:00.000Z")
      filtered = filtered.filter((tx) => new Date(tx.dateTime) < toDate)
    }

    return filtered
  }

  async getTotals(params: GetTotalsParams = {}): Promise<TotalsReportRow[]> {
    const { period = "month", from, to } = params
    const txs = await this.getMainBookTransactions(from, to)

    // Group by period
    const groups = new Map<string, { income: number; expense: number }>()

    for (const tx of txs) {
      const d = new Date(tx.dateTime)
      let key: string

      if (period === "day") {
        key = d.toISOString().slice(0, 10) // YYYY-MM-DD
      } else if (period === "week") {
        // ISO week: get Monday of the week
        const day = d.getUTCDay()
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(d)
        monday.setUTCDate(diff)
        key = monday.toISOString().slice(0, 10)
      } else if (period === "year") {
        key = d.getUTCFullYear().toString()
      } else {
        key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}` // YYYY-MM
      }

      const group = groups.get(key) || { income: 0, expense: 0 }
      if (tx.amount >= 0) {
        group.income += tx.amount
      } else {
        group.expense += tx.amount
      }
      groups.set(key, group)
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodKey, v]) => ({
        period: periodKey,
        income: Math.round(v.income * 100) / 100,
        expense: Math.round(v.expense * 100) / 100,
        net: Math.round((v.income + v.expense) * 100) / 100,
      }))
  }

  async getCategoryReport(params: GetCategoryReportParams = {}): Promise<CategoryReportRow[]> {
    const { from, to } = params
    const txs = await this.getMainBookTransactions(from, to)

    const groups = new Map<string, number>()
    for (const tx of txs) {
      const cat = tx.categoryName || "Uncategorized"
      const current = groups.get(cat) || 0
      groups.set(cat, current + tx.amount)
    }

    return Array.from(groups.entries())
      .map(([categoryName, amount]) => ({
        categoryName,
        amount: Math.round(amount * 100) / 100,
      }))
  }

  async getDailyReport(params: GetDailyReportParams): Promise<DailyReportRow[]> {
    const { from, to } = params
    if (!from || !to) {
      throw new Error("from and to query parameters are required")
    }

    const txs = await this.getMainBookTransactions(from, to)

    // Group by date
    const groups = new Map<string, number>()
    for (const tx of txs) {
      const key = new Date(tx.dateTime).toISOString().slice(0, 10) // YYYY-MM-DD
      const current = groups.get(key) || 0
      groups.set(key, current + tx.amount)
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        date,
        amount: Math.round(amount * 100) / 100,
      }))
  }

  async getMonthlyReport(params: GetMonthlyReportParams): Promise<MonthlyReportRow[]> {
    const { from, to } = params
    if (!from || !to) {
      throw new Error("from and to query parameters are required")
    }

    const txs = await this.getMainBookTransactions(from, to)

    // Group by YYYY-MM
    const groups = new Map<string, number>()
    for (const tx of txs) {
      const d = new Date(tx.dateTime)
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
      const current = groups.get(key) || 0
      groups.set(key, current + tx.amount)
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, amount]) => ({
        period,
        amount: Math.round(amount * 100) / 100,
      }))
  }

  async getDailyAverage(params: GetAverageParams): Promise<AverageReportDto> {
    const { from, to } = params
    if (!from || !to) {
      throw new Error("from and to query parameters are required")
    }

    const rows = await this.getDailyReport({ from, to })
    const daysWithTx = rows.length
    const totalSum = rows.reduce((sum, r) => sum + r.amount, 0)
    const average = daysWithTx > 0 ? Math.round((totalSum / daysWithTx) * 100) / 100 : 0

    return { average, count: daysWithTx }
  }

  async getMonthlyAverage(params: GetAverageParams): Promise<AverageReportDto> {
    const { from, to } = params
    if (!from || !to) {
      throw new Error("from and to query parameters are required")
    }

    const rows = await this.getMonthlyReport({ from, to })
    const monthsWithTx = rows.length
    const totalSum = rows.reduce((sum, r) => sum + r.amount, 0)
    const average = monthsWithTx > 0 ? Math.round((totalSum / monthsWithTx) * 100) / 100 : 0

    return { average, count: monthsWithTx }
  }
}