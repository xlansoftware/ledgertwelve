// ---------------------------------------------------------------------------
// useDailyInsight — orchestrates all data fetching, state, and selection
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { getFactory } from "@/features/offline"
import { useBooksStore } from "@/store/useBooksStore"
import type { DailyReportRow, CategoryReportRow, AverageReportDto } from "@/types"
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
 * Offsets a date by a number of days (positive or negative), correctly
 * rolling over/under month and year boundaries.
 *
 * @param daysOffset - Number of days to add (positive) or subtract (negative).
 * @param base - The date to offset from. Defaults to the current date/time.
 * @returns The resulting date as an ISO date string ("YYYY-MM-DD").
 */
function offsetDate(daysOffset: number, base: Date = new Date()): string {
  // Work in UTC to avoid DST/timezone shifting the calendar day unexpectedly.
  const result = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate())
  );

  result.setUTCDate(result.getUTCDate() + daysOffset);

  const year = result.getUTCFullYear();
  const month = String(result.getUTCMonth() + 1).padStart(2, "0");
  const day = String(result.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Get an ISO date string for the first day of a given date's month.
 */
function firstOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`
}

function firstOfMonth2(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`
}

/**
 * Get start and end ISO strings for a single day.
 */
function dayRange(dateStr: string): { from: string; to: string } {
  // from is inclusive, to is exclusive (next day at midnight)
  const nextDate = offsetDate(1, new Date(dateStr))
  return {
    from: `${dateStr}`,
    to: `${nextDate}`,
  }
}

/**
 * Returns "YYYY-MM-DD" for the last day of the month before `date`'s month.
 * Uses JavaScript's Date day-0 trick: new Date(year, month, 0) returns
 * the last day of the previous month.
 */
function lastDayOfPreviousMonth(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), 0)
  return d.toISOString().slice(0, 10)
}

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
 * Fill gaps in daily totals — ensure all N days are present.
 */
function fillDailyGaps(
  rows: DailyReportRow[],
  from: string,
  to: string,
): DailyReportRow[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    map.set(row.date, row.amount)
  }

  const filled: DailyReportRow[] = []
  const fromDate = new Date(from)
  const toDate = new Date(to)

  for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    filled.push({
      date: key,
      amount: map.get(key) ?? 0,
    })
  }

  return filled
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseDailyInsightReturn {
  // Pie chart data (for selected day, or today when null)
  expenses: Record<string, number>
  income: Record<string, number>
  isLoadingPie: boolean

  // Daily totals (area chart + list)
  dailyTotals: DailyReportRow[]
  accumulatedData: (AccumulatedRow | ProjectedRow)[]
  isLoadingDaily: boolean
  dailyError: string | null

  // Average (projection rate)
  averageChange: number | null
  isLoadingAverage: boolean
  averageError: string | null

  // Selection
  selectedDay: string | null // null = today

  // Actions
  selectDay: (date: string | null) => void
}

export function useDailyInsight(todayStr?: string): UseDailyInsightReturn {
  // ── Compute month-relative dates and constants ──
  const today = todayStr ?? offsetDate(0)
  const todayDate = useMemo(() => new Date(today + "T00:00:00"), [today])
  const lastNDays = todayDate.getDate() // days from 1st to today (inclusive)
  const daysInMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate()
  const trendMDays = daysInMonth - lastNDays // days from tomorrow to end of month

  // ── Daily totals ──
  const [dailyRows, setDailyRows] = useState<DailyReportRow[]>([])
  const [isLoadingDaily, setIsLoadingDaily] = useState(true)
  const [dailyError, setDailyError] = useState<string | null>(null)

  // ── Wide-window average (projection rate) ──
  const [averageChange, setAverageChange] = useState<number | null>(null)
  const [isLoadingAverage, setIsLoadingAverage] = useState(true)
  const [averageError, setAverageError] = useState<string | null>(null)

  // ── Opening balance (as of last day of previous month) ──
  const [openingBalance, setOpeningBalance] = useState<number | null>(null)

  // ── Pie chart category breakdown ──
  const [selectedDay, setSelectedDay] = useState<string | null>(null) // null = today
  const [pieRows, setPieRows] = useState<CategoryReportRow[]>([])
  const [isLoadingPie, setIsLoadingPie] = useState(true)
  const fetchRef = useRef<string | null>(null) // track latest request for stale-guard

  // ── Fetch daily totals (area chart + list) ──
  useEffect(() => {
    const from = firstOfMonth(todayDate)
    const reportTo = offsetDate(1) // exclusive upper bound = tomorrow

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingDaily(true)
    setDailyError(null)

    getFactory().reports.getDailyReport({ from, to: reportTo })
      .then((data) => {
        setDailyRows(data)
        setIsLoadingDaily(false)
      })
      .catch((err: unknown) => {
        setDailyError(err instanceof Error ? err.message : "Failed to load daily data")
        setIsLoadingDaily(false)
      })
  }, [today, todayDate])

  // ── Fetch wide-window average (365-day rolling) ──
  useEffect(() => {
    const from = offsetDate(-365, todayDate) // 365 days ago, inclusive
    const to = today // exclusive upper bound = today

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingAverage(true)
    setAverageError(null)

    getFactory().reports.getDailyAverage({ from, to })
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
  }, [today, todayDate])

  // ── Fetch opening balance as of last day of previous month ──
  useEffect(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-indexed

    const yearStart = `${currentYear}-01-01`
    const yearEnd = firstOfMonth2(currentYear + (currentMonth === 12 ? 1 : 0), currentMonth === 12 ? 1 : currentMonth + 1)

    getFactory().reports.getMonthlyReport({ from: yearStart, to: yearEnd })
      .then((data) => {
        const sum = data.reduce((prev, curr) => prev+curr.amount, 0);
        setOpeningBalance(sum)
      })
      .catch(() => {
        // Graceful degradation: openingBalance stays null, accumulation falls back to zero
        setOpeningBalance(null)
      })
  }, [])

  // ── Fetch pie chart categories (for selected day, or today when null) ──
  useEffect(() => {
    const date = selectedDay ?? today
    fetchRef.current = date
    const range = dayRange(date)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingPie(true)

    getFactory().reports.getCategoryReport(range)
      .then((data) => {
        // Guard against stale responses
        if (fetchRef.current === date) {
          setPieRows(data)
          setIsLoadingPie(false)
        }
      })
      .catch(() => {
        if (fetchRef.current === date) {
          setPieRows([])
          setIsLoadingPie(false)
        }
      })
  }, [selectedDay, today])

  // ── Split pie data by sign ──
  const { expenses, income } = useMemo(
    () => splitBySign(pieRows),
    [pieRows],
  )

  // ── Filled daily totals (gaps filled from first of month up to today inclusive) ──
  const filledDailyTotals = useMemo(() => {
    const from = firstOfMonth(todayDate)
    return fillDailyGaps(dailyRows, from, today)
  }, [dailyRows, todayDate, today])

  // ── Accumulated data with projection ──
  const accumulatedData = useMemo<(AccumulatedRow | ProjectedRow)[]>(() => {
    const seed = openingBalance ?? 0  // graceful degradation: fall back to zero
    const accumulated = computeAccumulation(filledDailyTotals, seed)

    if (averageChange !== null && accumulated.length > 0) {
      const lastRow = accumulated[accumulated.length - 1]
      const projection = computeProjectionFromAverage(
        lastRow.cumulative,
        averageChange,
        trendMDays,
        lastRow.date,
      )
      return [...accumulated, ...projection]
    }

    // Fallback: compute projection from short-window historical data
    const projection = computeProjection(accumulated, trendMDays)
    return [...accumulated, ...projection]
  }, [filledDailyTotals, trendMDays, openingBalance, averageChange])

  // ── Actions ──

  const selectDay = useCallback((date: string | null) => {
    if (date === fetchRef.current) return // already selected, no-op
    setSelectedDay(date)
  }, [])

  // ── Return ──

  return {
    expenses,
    income,
    isLoadingPie,

    dailyTotals: filledDailyTotals,
    accumulatedData,
    isLoadingDaily,
    dailyError,

    averageChange,
    isLoadingAverage,
    averageError,

    selectedDay,

    selectDay,
  }
}