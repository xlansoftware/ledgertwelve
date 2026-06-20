// ---------------------------------------------------------------------------
// useDailyInsight — orchestrates all data fetching, state, and selection
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { getCategoryReport, getDailyReport } from "@/services/reportsService"
import type { DailyReportRow, CategoryReportRow } from "@/types"
import {
  computeAccumulation,
  computeProjection,
} from "./insightUtils"
import type { AccumulatedRow, ProjectedRow } from "./insightUtils"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get an ISO date string for a date offset from a given base date.
 * Defaults to today if no base date is given.
 */
function offsetDate(daysOffset: number, base?: Date): string {
  const d = base ? new Date(base) : new Date()
  d.setDate(d.getDate() + daysOffset)
  return d.toISOString().slice(0, 10)
}

/**
 * Get an ISO date string for the first day of a given date's month.
 */
function firstOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`
}

/**
 * Get start and end ISO strings for a single day.
 */
function dayRange(dateStr: string): { from: string; to: string } {
  return {
    from: `${dateStr}T00:00:00`,
    to: `${dateStr}T23:59:59`,
  }
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
  // Today's pie data
  todayExpenses: Record<string, number>
  todayIncome: Record<string, number>
  isLoadingToday: boolean
  todayError: string | null

  // Daily totals (area chart + list)
  dailyTotals: DailyReportRow[]
  accumulatedData: (AccumulatedRow | ProjectedRow)[]
  isLoadingDaily: boolean
  dailyError: string | null

  // Selection
  selectedDay: string | null // null = today
  selectedDayExpenses: Record<string, number>
  selectedDayIncome: Record<string, number>
  isLoadingSelectedDay: boolean

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

  // ── Today's category breakdown ──
  const [todayRows, setTodayRows] = useState<CategoryReportRow[]>([])
  const [isLoadingToday, setIsLoadingToday] = useState(true)
  const [todayError, setTodayError] = useState<string | null>(null)

  // ── Daily totals ──
  const [dailyRows, setDailyRows] = useState<DailyReportRow[]>([])
  const [isLoadingDaily, setIsLoadingDaily] = useState(true)
  const [dailyError, setDailyError] = useState<string | null>(null)

  // ── Selected day category breakdown ──
  const [selectedDay, setSelectedDay] = useState<string | null>(null) // null = today
  const [selectedDayRows, setSelectedDayRows] = useState<CategoryReportRow[]>([])
  const [isLoadingSelectedDay, setIsLoadingSelectedDay] = useState(false)
  const selectedDayRef = useRef<string | null>(null) // track latest for stale-request guard

  // ── Fetch today's categories ──
  useEffect(() => {
    const range = dayRange(today)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingToday(true)
    setTodayError(null)

    getCategoryReport(range)
      .then((data) => {
        setTodayRows(data)
        setIsLoadingToday(false)
      })
      .catch((err: unknown) => {
        setTodayError(err instanceof Error ? err.message : "Failed to load today's data")
        setIsLoadingToday(false)
      })
  }, [])

  // ── Fetch daily totals (area chart + list) ──
  useEffect(() => {
    const to = today
    const from = firstOfMonth(todayDate)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingDaily(true)
    setDailyError(null)

    getDailyReport({ from, to })
      .then((data) => {
        setDailyRows(data)
        setIsLoadingDaily(false)
      })
      .catch((err: unknown) => {
        setDailyError(err instanceof Error ? err.message : "Failed to load daily data")
        setIsLoadingDaily(false)
      })
  }, [])

  // ── Fetch selected day's categories ──
  useEffect(() => {
    if (selectedDay === null) {
      // null means "today" — we already have today's data, no extra fetch needed
      return
    }

    selectedDayRef.current = selectedDay
    const range = dayRange(selectedDay)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingSelectedDay(true)

    getCategoryReport(range)
      .then((data) => {
        // Guard against stale responses
        if (selectedDayRef.current === selectedDay) {
          setSelectedDayRows(data)
          setIsLoadingSelectedDay(false)
        }
      })
      .catch(() => {
        if (selectedDayRef.current === selectedDay) {
          setSelectedDayRows([])
          setIsLoadingSelectedDay(false)
        }
      })
  }, [selectedDay])

  // ── Split today's data by sign ──
  const { expenses: todayExpenses, income: todayIncome } = useMemo(
    () => splitBySign(todayRows),
    [todayRows],
  )

  // ── Filled daily totals (gaps filled) ──
  const filledDailyTotals = useMemo(() => {
    const to = today
    const from = firstOfMonth(todayDate)
    return fillDailyGaps(dailyRows, from, to)
  }, [dailyRows, todayDate, today])

  // ── Accumulated data with projection ──
  const accumulatedData = useMemo<(AccumulatedRow | ProjectedRow)[]>(() => {
    const accumulated = computeAccumulation(filledDailyTotals)
    const projection = computeProjection(accumulated, trendMDays)
    return [...accumulated, ...projection]
  }, [filledDailyTotals, trendMDays])

  // ── Split selected day's data by sign ──
  const { expenses: selectedDayExpenses, income: selectedDayIncome } = useMemo(
    () => splitBySign(selectedDayRows),
    [selectedDayRows],
  )

  // ── Actions ──

  const selectDay = useCallback((date: string | null) => {
    if (date === selectedDayRef.current) return // already selected, no-op
    setSelectedDay(date)
  }, [])

  // ── Return ──

  return {
    todayExpenses,
    todayIncome,
    isLoadingToday,
    todayError,

    dailyTotals: filledDailyTotals,
    accumulatedData,
    isLoadingDaily,
    dailyError,

    selectedDay,
    selectedDayExpenses,
    selectedDayIncome,
    isLoadingSelectedDay,

    selectDay,
  }
}
