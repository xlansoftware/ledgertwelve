// ---------------------------------------------------------------------------
// useMonthlyInsight — orchestrates data fetching, state, and month/year selection
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { getFactory } from "@/features/offline"
import type { MonthlyReportRow, CategoryReportRow, AverageReportDto } from "@/types"
import {
  computeAccumulation,
  computeProjection,
  computeProjectionFromAverage,
} from "@/pages/insight/insightUtils"
import type { AccumulatedRow, ProjectedRow } from "@/pages/insight/insightUtils"
import {
  fillYearMonths,
  lastMonthWithTransactions,
  resolveDefaultYear,
  yearStats,
} from "./monthlyInsightUtils"

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
  // Pie chart data (for the effective pie month)
  expenses: Record<string, number>
  income: Record<string, number>
  isLoadingPie: boolean

  // Monthly totals (area chart + list)
  monthlyTotals: MonthlyReportRow[]
  accumulatedData: (AccumulatedRow | ProjectedRow)[]
  isLoadingMonthly: boolean
  monthlyError: string | null

  // Average (projection rate — current year only)
  averageChange: number | null
  isLoadingAverage: boolean
  averageError: string | null

  // Chart header values
  chartAverage: number | null
  chartEndValue: number | null

  // Year navigation
  years: string[]
  yearNets: Record<string, number>
  selectedYear: string | null // null = most recent year with transactions
  activeYear: string // resolved year actually being viewed
  isCurrentYear: boolean
  isLoadingYears: boolean
  yearsError: string | null

  // Selection
  selectedMonth: string | null // null = default month for the active year
  pieMonth: string | null // effective month the pie is showing ("YYYY-MM")

  // Actions
  selectMonth: (month: string | null) => void
  selectYear: (year: string | null) => void
}

export function useMonthlyInsight(): UseMonthlyInsightReturn {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-indexed
  const currentYearStr = String(currentYear)
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`

  // ── Year list (years with transactions, from GET /reports/totals?period=year) ──
  const [years, setYears] = useState<string[]>([])
  const [yearNets, setYearNets] = useState<Record<string, number>>({})
  const [isLoadingYears, setIsLoadingYears] = useState(true)
  const [yearsError, setYearsError] = useState<string | null>(null)

  // ── Selection state ──
  // selectedYear: null = "most recent year with transactions" (today's default)
  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  // selectedMonth: null = default month for the active year
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  // Resolved year being viewed: the user's selection, otherwise the most
  // recent year with transactions (falls back to the current year while the
  // year list is still loading).
  const activeYear = selectedYear ?? resolveDefaultYear(years, currentYearStr)
  const isCurrentYear = activeYear === currentYearStr

  // ── Date ranges for the active year ──
  const yearStart = `${activeYear}-01-01`
  const yearEnd = `${Number(activeYear) + 1}-01-01`

  // ── Monthly totals ──
  const [monthlyRows, setMonthlyRows] = useState<MonthlyReportRow[]>([])
  const [monthlyRowsYear, setMonthlyRowsYear] = useState<string | null>(null)
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(true)
  const [monthlyError, setMonthlyError] = useState<string | null>(null)
  const monthlyFetchRef = useRef<string | null>(null) // stale-guard for year switches

  // ── Wide-window average (projection rate) ──
  const [averageChange, setAverageChange] = useState<number | null>(null)
  const [isLoadingAverage, setIsLoadingAverage] = useState(true)
  const [averageError, setAverageError] = useState<string | null>(null)

  // ── Pie chart category breakdown ──
  const [pieRows, setPieRows] = useState<CategoryReportRow[]>([])
  const [isLoadingPie, setIsLoadingPie] = useState(true)
  const fetchRef = useRef<string | null>(null) // track latest request for stale-guard

  // ── Fetch the year list once on mount ──
  useEffect(() => {
    getFactory().reports.getTotals({ period: "year" })
      .then((data) => {
        const nets: Record<string, number> = {}
        const yearList: string[] = []
        for (const row of data) {
          if (/^\d{4}$/.test(row.period)) {
            nets[row.period] = row.net
            yearList.push(row.period)
          }
        }
        setYearNets(nets)
        setYears(yearList)
        setIsLoadingYears(false)
      })
      .catch((err: unknown) => {
        setYearsError(err instanceof Error ? err.message : "Failed to load years")
        setIsLoadingYears(false)
      })
  }, [])

  // ── Fetch monthly totals (area chart + list) for the active year ──
  useEffect(() => {
    const year = activeYear
    monthlyFetchRef.current = year
    // Note: isLoadingMonthly is not reset here — existing chart/list data stays
    // visible while a year switch is loading (no flicker to skeletons).

    getFactory().reports.getMonthlyReport({ from: yearStart, to: yearEnd })
      .then((data) => {
        if (monthlyFetchRef.current !== year) return // stale response from a previous year
        setMonthlyRows(data)
        setMonthlyRowsYear(year)
        setMonthlyError(null)
        setIsLoadingMonthly(false)
      })
      .catch((err: unknown) => {
        if (monthlyFetchRef.current !== year) return
        setMonthlyRows([])
        setMonthlyRowsYear(null)
        setMonthlyError(err instanceof Error ? err.message : "Failed to load monthly data")
        setIsLoadingMonthly(false)
      })
  }, [activeYear, yearStart, yearEnd])

  // ── Fetch wide-window average (12-month rolling) — current year only ──
  useEffect(() => {
    if (activeYear !== currentYearStr) {
      // Completed years have no projection, so no rolling average is fetched.
      return
    }

    // 12 months ago, 1st of that month → 1st of current month (exclusive)
    const fromDate = new Date(Date.UTC(currentYear, currentMonth - 13, 1))
    const fromStr = fromDate.toISOString().slice(0, 10)
    const toStr = firstOfMonth(currentYear, currentMonth)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingAverage(true)

    getFactory().reports.getMonthlyAverage({ from: fromStr, to: toStr })
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
  }, [activeYear, currentYearStr, currentYear, currentMonth])

  // ── Effective pie month ──
  // Current year: the selected month, or the current month when nothing is selected.
  // Past years: the selected month, or that year's last month with transactions.
  const pieMonth = useMemo(() => {
    if (activeYear === currentYearStr) {
      return selectedMonth ?? currentMonthStr
    }
    return selectedMonth ?? lastMonthWithTransactions(monthlyRows, activeYear)
  }, [selectedMonth, activeYear, monthlyRows, currentYearStr, currentMonthStr])

  // ── Fetch pie chart categories (for the effective pie month) ──
  useEffect(() => {
    if (pieMonth === null) return // active year's data not loaded yet — keep previous pie
    fetchRef.current = pieMonth
    const range = monthRange(pieMonth)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingPie(true)

    getFactory().reports.getCategoryReport(range)
      .then((data) => {
        // Guard against stale responses
        if (fetchRef.current === pieMonth) {
          setPieRows(data)
          setIsLoadingPie(false)
        }
      })
      .catch(() => {
        if (fetchRef.current === pieMonth) {
          setPieRows([])
          setIsLoadingPie(false)
        }
      })
  }, [pieMonth])

  // ── Split pie data by sign ──
  const { expenses, income } = useMemo(
    () => splitBySign(pieRows),
    [pieRows],
  )

  // ── Fill gaps in monthly totals ──
  // Keyed by the year the rows were loaded for, so existing data stays visible
  // while a year switch is loading (stale rows are not re-labelled as the new year).
  const filledMonthlyTotals = useMemo(() => {
    if (monthlyRowsYear === null) return []
    const isLoadedYearCurrent = monthlyRowsYear === currentYearStr
    return fillYearMonths(monthlyRows, monthlyRowsYear, isLoadedYearCurrent, currentMonth)
  }, [monthlyRows, monthlyRowsYear, currentYearStr, currentMonth])

  // ── Remaining months in the current year for projection ──
  const remainingMonths = 12 - currentMonth

  // ── Accumulated data with projection (current year only) ──
  const accumulatedData = useMemo<(AccumulatedRow | ProjectedRow)[]>(() => {
    const mapped = filledMonthlyTotals.map((row) => ({
      date: row.period,
      amount: row.amount,
    }))
    // Each year stands on its own: the seed stays zero (no opening balance).
    const accumulated = computeAccumulation(mapped, 0)

    if (!isCurrentYear) {
      // Completed years: historical accumulated curve only, no projection.
      return accumulated
    }

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
  }, [filledMonthlyTotals, remainingMonths, averageChange, isCurrentYear])

  // ── Chart header values ──
  // Current year: rolling-window average and projected end (unchanged).
  // Past years: the year's own average monthly net and actual year-end balance.
  const yearStatistics = useMemo(() => {
    if (monthlyRowsYear === null) return { averageMonthlyNet: null, yearEndNet: null }
    return yearStats(monthlyRows, monthlyRowsYear)
  }, [monthlyRows, monthlyRowsYear])

  const chartAverage = isCurrentYear ? averageChange : yearStatistics.averageMonthlyNet

  const chartEndValue = useMemo(() => {
    if (isCurrentYear) {
      const last = accumulatedData[accumulatedData.length - 1]
      return last ? last.cumulative : null
    }
    return yearStatistics.yearEndNet
  }, [isCurrentYear, accumulatedData, yearStatistics])

  // ── Actions ──

  const selectMonth = useCallback((month: string | null) => {
    if (month === fetchRef.current) return // already selected, no-op
    setSelectedMonth(month)
  }, [])

  const selectYear = useCallback((year: string | null) => {
    setSelectedYear(year)
    setSelectedMonth(null) // reset month selection when switching years
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

    chartAverage,
    chartEndValue,

    years,
    yearNets,
    selectedYear,
    activeYear,
    isCurrentYear,
    isLoadingYears,
    yearsError,

    selectedMonth,
    pieMonth,

    selectMonth,
    selectYear,
  }
}
