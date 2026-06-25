// ---------------------------------------------------------------------------
// InsightPage — dashboard with daily, monthly, and yearly spending charts
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { useNavigate } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { InsightComponent } from "@/pages/insight/InsightComponent"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { getDailyReport, getMonthlyReport, getCategoryReport } from "@/services/reportsService"
import type { DailyReportRow, MonthlyReportRow, CategoryReportRow } from "@/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dayRange(dateStr: string): { from: string; to: string } {
  const d = new Date(dateStr + "T00:00:00")
  const next = new Date(d)
  next.setDate(next.getDate() + 1)
  return {
    from: dateStr,
    to: next.toISOString().slice(0, 10),
  }
}

function monthRange(period: string): { from: string; to: string } {
  const [yearStr, monthStr] = period.split("-")
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)
  const from = `${year}-${String(month).padStart(2, "0")}-01`
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
  return { from, to }
}

function firstOfMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`
}

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

function dailyFormatPieTitle(selectedDay: string | null): string {
  if (selectedDay === null) return "Today"
  const d = new Date(selectedDay + "T00:00:00")
  return format(d, "EEE, MMM d")
}

function monthlyFormatPieTitle(selectedMonth: string | null): string {
  if (selectedMonth === null) return "This Month"
  const [year, month] = selectedMonth.split("-")
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return format(d, "MMM yyyy")
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InsightPage() {
  const navigate = useNavigate()

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const currentYear = now.getFullYear()

  // ── Daily totals (for fallback detection) ──
  const [dailyTotals, setDailyTotals] = useState<DailyReportRow[]>([])
  const [isLoadingDailyTotals, setIsLoadingDailyTotals] = useState(true)

  // ── Monthly totals (for fallback detection) ──
  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyReportRow[]>([])
  const [isLoadingMonthlyTotals, setIsLoadingMonthlyTotals] = useState(true)

  // ── Pie data (category breakdown) ──
  const [dailySelectedDay, setDailySelectedDay] = useState<string | null>(null)
  const [dailyCategoryRows, setDailyCategoryRows] = useState<CategoryReportRow[]>([])
  const [isLoadingDailyPie, setIsLoadingDailyPie] = useState(true)

  const [monthlySelectedMonth, setMonthlySelectedMonth] = useState<string | null>(null)
  const [monthlyCategoryRows, setMonthlyCategoryRows] = useState<CategoryReportRow[]>([])
  const [isLoadingMonthlyPie, setIsLoadingMonthlyPie] = useState(true)

  const [yearlyCategoryRows, setYearlyCategoryRows] = useState<CategoryReportRow[]>([])
  const [isLoadingYearlyPie, setIsLoadingYearlyPie] = useState(true)

  // Track whether fallback check has been performed (one-time per mount)
  const dailyFallbackDone = useRef(false)
  const monthlyFallbackDone = useRef(false)

  // ── Fetch daily totals (month-to-date, for fallback) ──
  useEffect(() => {
    setIsLoadingDailyTotals(true)
    const from = firstOfMonth(now)
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const to = tomorrow.toISOString().slice(0, 10)

    getDailyReport({ from, to })
      .then((data) => {
        setDailyTotals(data)
        setIsLoadingDailyTotals(false)
      })
      .catch(() => {
        setIsLoadingDailyTotals(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch monthly totals (year-to-date, for fallback) ──
  useEffect(() => {
    setIsLoadingMonthlyTotals(true)
    const from = `${currentYear}-01-01`
    const to = `${currentYear + 1}-01-01`

    getMonthlyReport({ from, to })
      .then((data) => {
        setMonthlyTotals(data)
        setIsLoadingMonthlyTotals(false)
      })
      .catch(() => {
        setIsLoadingMonthlyTotals(false)
      })
  }, [currentYear])

  // ── Fetch yearly category data (for "this year" chart) ──
  useEffect(() => {
    setIsLoadingYearlyPie(true)
    const from = `${currentYear}-01-01`
    const to = `${currentYear + 1}-01-01`

    getCategoryReport({ from, to })
      .then((data) => {
        setYearlyCategoryRows(data)
        setIsLoadingYearlyPie(false)
      })
      .catch(() => {
        setYearlyCategoryRows([])
        setIsLoadingYearlyPie(false)
      })
  }, [currentYear])

  // ── Daily fallback: if today has no transactions, pick most recent day with data ──
  useEffect(() => {
    if (dailyFallbackDone.current) return
    if (isLoadingDailyTotals) return

    const todayHasData = dailyTotals.some(
      (row) => row.date === todayStr && row.amount !== 0,
    )

    if (!todayHasData) {
      const fallback = [...dailyTotals]
        .filter((row) => row.amount !== 0)
        .sort((a, b) => b.date.localeCompare(a.date))

      if (fallback.length > 0) {
        setDailySelectedDay(fallback[0].date)
      }
    }

    dailyFallbackDone.current = true
  }, [isLoadingDailyTotals, dailyTotals, todayStr])

  // ── Monthly fallback: if this month has no transactions, pick most recent month with data ──
  useEffect(() => {
    if (monthlyFallbackDone.current) return
    if (isLoadingMonthlyTotals) return

    const thisMonthHasData = monthlyTotals.some(
      (row) => row.period === thisMonthStr && row.amount !== 0,
    )

    if (!thisMonthHasData) {
      const fallback = [...monthlyTotals]
        .filter((row) => row.amount !== 0)
        .sort((a, b) => b.period.localeCompare(a.period))

      if (fallback.length > 0) {
        setMonthlySelectedMonth(fallback[0].period)
      }
    }

    monthlyFallbackDone.current = true
  }, [isLoadingMonthlyTotals, monthlyTotals, thisMonthStr])

  // ── Fetch daily pie data (category breakdown for the effective day) ──
  useEffect(() => {
    setIsLoadingDailyPie(true)
    const date = dailySelectedDay ?? todayStr
    const range = dayRange(date)

    getCategoryReport(range)
      .then((data) => {
        setDailyCategoryRows(data)
        setIsLoadingDailyPie(false)
      })
      .catch(() => {
        setDailyCategoryRows([])
        setIsLoadingDailyPie(false)
      })
  }, [dailySelectedDay, todayStr])

  // ── Fetch monthly pie data (category breakdown for the effective month) ──
  useEffect(() => {
    setIsLoadingMonthlyPie(true)
    const period = monthlySelectedMonth ?? thisMonthStr
    const range = monthRange(period)

    getCategoryReport(range)
      .then((data) => {
        setMonthlyCategoryRows(data)
        setIsLoadingMonthlyPie(false)
      })
      .catch(() => {
        setMonthlyCategoryRows([])
        setIsLoadingMonthlyPie(false)
      })
  }, [monthlySelectedMonth, thisMonthStr])

  // ── Split category data by sign ──
  const { expenses: dailyExpenses, income: dailyIncome } =
    splitBySign(dailyCategoryRows)
  const { expenses: monthlyExpenses, income: monthlyIncome } =
    splitBySign(monthlyCategoryRows)
  const { expenses: yearlyExpenses, income: yearlyIncome } =
    splitBySign(yearlyCategoryRows)

  // ── Computed display states ──
  const dailyPieTitle = dailyFormatPieTitle(dailySelectedDay)
  const dailyHasPieData =
    Object.keys(dailyExpenses).length > 0 || Object.keys(dailyIncome).length > 0
  const dailyShowPieSkeleton = isLoadingDailyPie && !dailyHasPieData

  const monthlyPieTitle = monthlyFormatPieTitle(monthlySelectedMonth)
  const monthlyHasPieData =
    Object.keys(monthlyExpenses).length > 0 || Object.keys(monthlyIncome).length > 0
  const monthlyShowPieSkeleton = isLoadingMonthlyPie && !monthlyHasPieData

  const yearlyPieTitle = `${currentYear}`
  const yearlyHasPieData =
    Object.keys(yearlyExpenses).length > 0 || Object.keys(yearlyIncome).length > 0
  const yearlyShowPieSkeleton = isLoadingYearlyPie && !yearlyHasPieData

  // ── Render ──
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-2 px-4 items-stretch">

      <div className="flex-1 flex flex-col items-end relative -mb-10 z-10">
        <ButtonGroup>
          <Button variant="outline" onClick={() => navigate("/insight/daily")}>
            Month
          </Button>
          <Button variant="outline" onClick={() => navigate("/insight/monthly")}>
            Year
          </Button>
        </ButtonGroup>
      </div>

      {/* ── Daily Insight Card ── */}
      <section>
        {dailyShowPieSkeleton ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-56 w-56 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : dailyHasPieData ? (
          <InsightComponent
            data={dailyExpenses}
            altData={dailyIncome}
            title={dailyPieTitle}
          />
        ) : (
          <InsightComponent
            data={{}}
            title={dailyPieTitle}
          />
        )}
      </section>

      {/* ── Monthly Insight Card ── */}
      <section>
        {monthlyShowPieSkeleton ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-56 w-56 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : monthlyHasPieData ? (
          <InsightComponent
            data={monthlyExpenses}
            altData={monthlyIncome}
            title={monthlyPieTitle}
          />
        ) : (
          <InsightComponent
            data={{}}
            title={monthlyPieTitle}
          />
        )}
      </section>

      {/* ── Yearly Insight Card ── */}
      <section>
        {yearlyShowPieSkeleton ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-56 w-56 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : yearlyHasPieData ? (
          <InsightComponent
            data={yearlyExpenses}
            altData={yearlyIncome}
            title={yearlyPieTitle}
          />
        ) : (
          <InsightComponent
            data={{}}
            title={yearlyPieTitle}
          />
        )}
      </section>
    </div>
  )
}
