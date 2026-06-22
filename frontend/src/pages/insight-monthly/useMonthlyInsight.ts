// ---------------------------------------------------------------------------
// useMonthlyInsight — orchestrates data fetching, state, and month selection
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { getCategoryReport, getMonthlyReport, getMonthlyAverage } from "@/services/reportsService"
import { getBookStats } from "@/services/booksService"
import type { MonthlyReportRow, CategoryReportRow, AverageReportDto } from "@/types"
import {
  computeAccumulation,
  computeProjection,
  computeProjectionFromAverage,
} from "@/pages/insight/insightUtils"
import type { AccumulatedRow, ProjectedRow } from "@/pages/insight/insightUtils"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Split CategoryReportRow[] into expenses (amount < 0, absolute) and income (amount > 0, absolute).
 */
function splitBySign(
  rows: CategoryReportRow[],
): { expenses: Record<string, number>; income: Record<string, number> } {
  const expenses: Record<string, number> = {}
  const income: Record<string, number> = {}

  for (const row of rows) {
    if (row.amount < 0) {
      expenses[row.categoryName] = Math.abs(row.amount)
    } else {
      income[row.categoryName] = row.amount
    }
  }

  return { expenses, income }
}

/**
 * Get an ISO date string for the first day of a given year-month.
 */
function firstOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`
}

/**
 * Get start and end ISO strings for a single month ("YYYY-MM").
 * Returns from=YYYY-MM-DD, to=next month's YYYY-MM-DD (exclusive).
 */
function monthRange(period: string): { from: string; to: string } {
  const [yearStr, monthStr] = period.split("-")
  const year = parseInt(yearStr)
  const month = parseInt(monthStr) // 1-indexed

  const from = firstOfMonth(year, month)
  // First day of next month = exclusive upper bound
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = firstOfMonth(nextYear, nextMonth)

  return { from, to }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseMonthlyInsightReturn {
  // Pie chart data (for selected month, or current month when null)
  expenses: Record<string, number>
  income: Record<string, number>
  isLoadingPie: boolean

  // Monthly totals (area chart + list)
  monthlyTotals: MonthlyReportRow[]
  accumulatedData: (AccumulatedRow | ProjectedRow)[]
  isLoadingMonthly: boolean
  monthlyError: string | null

  // Average (projection rate)
  averageChange: number | null
  isLoadingAverage: boolean
  averageError: string | null

  // Selection
  selectedMonth: string | null // null = current month ("YYYY-MM")

  // Actions
  selectMonth: (month: string | null) => void
}

export function useMonthlyInsight(): UseMonthlyInsightReturn {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-indexed
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`

  // ── Date ranges ──
  const yearStart = `${currentYear}-01-01`
  const yearEnd = firstOfMonth(currentYear + (currentMonth === 12 ? 1 : 0), currentMonth === 12 ? 1 : currentMonth + 1)

  // Opening balance as of Dec 31 of previous year
  const previousYearEnd = `${currentYear - 1}-12-31`

  // Remaining months in the year for projection
  const remainingMonths = 12 - currentMonth

  // ── Monthly totals ──
  const [monthlyRows, setMonthlyRows] = useState<MonthlyReportRow[]>([])
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(true)
  const [monthlyError, setMonthlyError] = useState<string | null>(null)

  // ── Wide-window average (projection rate) ──
  const [averageChange, setAverageChange] = useState<number | null>(null)
  const [isLoadingAverage, setIsLoadingAverage] = useState(true)
  const [averageError, setAverageError] = useState<string | null>(null)

  // ── Opening balance (as of Dec 31 previous year) ──
  const [/*openingBalance*/, setOpeningBalance] = useState<number | null>(null)

  // ── Pie chart category breakdown ──
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null) // null = current month
  const [pieRows, setPieRows] = useState<CategoryReportRow[]>([])
  const [isLoadingPie, setIsLoadingPie] = useState(true)
  const fetchRef = useRef<string | null>(null) // track latest request for stale-guard

  // ── Fetch monthly totals (area chart + list) ──
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingMonthly(true)
    setMonthlyError(null)

    getMonthlyReport({ from: yearStart, to: yearEnd })
      .then((data) => {
        setMonthlyRows(data)
        setIsLoadingMonthly(false)
      })
      .catch((err: unknown) => {
        setMonthlyError(err instanceof Error ? err.message : "Failed to load monthly data")
        setIsLoadingMonthly(false)
      })
  }, [yearStart, yearEnd])

  // ── Fetch wide-window average (12-month rolling) ──
  useEffect(() => {
    // 12 months ago, 1st of that month → 1st of current month (exclusive)
    const fromDate = new Date(currentYear, currentMonth - 13, 1)
    const fromStr = fromDate.toISOString().slice(0, 10)
    const toStr = firstOfMonth(currentYear, currentMonth)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingAverage(true)
    setAverageError(null)

    getMonthlyAverage({ from: fromStr, to: toStr })
      .then((data: AverageReportDto) => {
        setAverageChange(data.average)
        setIsLoadingAverage(false)
      })
      .catch(() => {
        // Graceful degradation: averageChange stays null, falls back to short-window projection
        setAverageChange(null)
        setIsLoadingAverage(false)
        setAverageError(null) // suppress error — user sees existing chart
      })
  }, [yearStart, yearEnd, currentYear, currentMonth])

  // ── Fetch opening balance as of Dec 31 of previous year ──
  useEffect(() => {
    getBookStats("book_main", { asOf: previousYearEnd })
      .then((stats) => {
        setOpeningBalance(stats.totalSum)
      })
      .catch(() => {
        // Graceful degradation: openingBalance stays null, accumulation falls back to zero
        setOpeningBalance(null)
      })
  }, [previousYearEnd])

  // ── Fetch pie chart categories (for selected month, or current month when null) ──
  useEffect(() => {
    const month = selectedMonth ?? currentMonthStr
    fetchRef.current = month
    const range = monthRange(month)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingPie(true)

    getCategoryReport(range)
      .then((data) => {
        // Guard against stale responses
        if (fetchRef.current === month) {
          setPieRows(data)
          setIsLoadingPie(false)
        }
      })
      .catch(() => {
        if (fetchRef.current === month) {
          setPieRows([])
          setIsLoadingPie(false)
        }
      })
  }, [selectedMonth, currentMonthStr])

  // ── Split pie data by sign ──
  const { expenses, income } = useMemo(
    () => splitBySign(pieRows),
    [pieRows],
  )

  // ── Fill gaps in monthly totals (ensure all months Jan → current are present) ──
  const filledMonthlyTotals = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of monthlyRows) {
      map.set(row.period, row.amount)
    }

    const filled: MonthlyReportRow[] = []
    for (let m = 1; m <= currentMonth; m++) {
      const key = `${currentYear}-${String(m).padStart(2, "0")}`
      filled.push({
        period: key,
        amount: map.get(key) ?? 0,
      })
    }

    return filled
  }, [monthlyRows, currentYear, currentMonth])

  // ── Accumulated data with projection ──
  const accumulatedData = useMemo<(AccumulatedRow | ProjectedRow)[]>(() => {
    // const seed = openingBalance ?? 0 // graceful degradation: fall back to zero
    const seed = 0 // try the version where each year is of it's own
    const mapped = filledMonthlyTotals.map((row) => ({
      date: row.period,
      amount: row.amount,
    }))
    const accumulated = computeAccumulation(mapped, seed)

    if (averageChange !== null && accumulated.length > 0) {
      const lastRow = accumulated[accumulated.length - 1]
      const projection = computeProjectionFromAverage(
        lastRow.cumulative,
        averageChange,
        remainingMonths,
        lastRow.date,
      )
      return [...accumulated, ...projection]
    }

    // Fallback: compute projection from short-window historical data
    const projection = computeProjection(accumulated, remainingMonths)
    return [...accumulated, ...projection]
  }, [filledMonthlyTotals, remainingMonths, averageChange])

  // ── Actions ──

  const selectMonth = useCallback((month: string | null) => {
    if (month === fetchRef.current) return // already selected, no-op
    setSelectedMonth(month)
  }, [])

  // ── Return ──

  return {
    expenses,
    income,
    isLoadingPie,

    monthlyTotals: filledMonthlyTotals,
    accumulatedData,
    isLoadingMonthly,
    monthlyError,

    averageChange,
    isLoadingAverage,
    averageError,

    selectedMonth,

    selectMonth,
  }
}