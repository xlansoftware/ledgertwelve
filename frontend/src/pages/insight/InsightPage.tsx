// ---------------------------------------------------------------------------
// InsightPage — dashboard with daily, monthly, and yearly spending charts
// ---------------------------------------------------------------------------

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { useNavigate } from "react-router-dom"
import { InsightComponent } from "@/pages/insight/InsightComponent"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { useBooksStore } from "@/store"
import { getTransactions } from "@/services"
import type { CategoryReportRow, TransactionDto } from "@/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Extract local "YYYY-MM-DD" from an ISO date-time string. */
function toLocalDate(iso: string): string {
  const d = parseISO(iso)
  return format(d, "yyyy-MM-dd")
}

/** Extract local "YYYY-MM" from an ISO date-time string. */
function toLocalMonth(iso: string): string {
  const d = parseISO(iso)
  return format(d, "yyyy-MM")
}

/** Group transactions by category, summing amounts. */
function groupByCategory(txs: TransactionDto[]): CategoryReportRow[] {
  const map = new Map<string, number>()
  for (const tx of txs) {
    const cat = tx.categoryName || "Uncategorized"
    map.set(cat, (map.get(cat) ?? 0) + tx.amount)
  }
  return Array.from(map.entries()).map(([categoryName, amount]) => ({
    categoryName,
    amount: Math.round(amount * 100) / 100,
  }))
}

// ---------------------------------------------------------------------------
// Page size for fetching a full year of transactions at once
// ---------------------------------------------------------------------------

const LARGE_PAGE_SIZE = 10000

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InsightPage() {
  const navigate = useNavigate()
  const mainBookId = useBooksStore((s) => s.mainBookId)

  const now = new Date()
  const currentYear = now.getFullYear()

  // ── Data state ──
  const [dailyCategoryRows, setDailyCategoryRows] = useState<CategoryReportRow[]>([])
  const [monthlyCategoryRows, setMonthlyCategoryRows] = useState<CategoryReportRow[]>([])
  const [yearlyCategoryRows, setYearlyCategoryRows] = useState<CategoryReportRow[]>([])
  const [dailyDay, setDailyDay] = useState<string | null>(null)
  const [monthlyMonth, setMonthlyMonth] = useState<string | null>(null)

  // ── Loading / error ──
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch all transactions for the current year, then aggregate ──
  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!mainBookId) return

      setIsLoading(true)
      setError(null)

      try {
        const from = `${currentYear}-01-01`
        const to = `${currentYear + 1}-01-01`

        const { items: allTxs } = await getTransactions({
          bookId: mainBookId,
          from,
          to,
          pageSize: LARGE_PAGE_SIZE,
        })

        if (cancelled) return

        if (allTxs.length === 0) {
          setDailyCategoryRows([])
          setMonthlyCategoryRows([])
          setYearlyCategoryRows([])
          setDailyDay(null)
          setMonthlyMonth(null)
          return
        }

        // Transactions arrive sorted by dateTime descending (newest first).
        // The first transaction determines the "last available" day and month.
        const newest = allTxs[0]
        const lastDay = toLocalDate(newest.dateTime)
        const lastMonth = toLocalMonth(newest.dateTime)

        // Partition by period
        const dailyTxs = allTxs.filter((tx) => toLocalDate(tx.dateTime) === lastDay)
        const monthlyTxs = allTxs.filter((tx) => toLocalMonth(tx.dateTime) === lastMonth)

        setDailyCategoryRows(groupByCategory(dailyTxs))
        setMonthlyCategoryRows(groupByCategory(monthlyTxs))
        setYearlyCategoryRows(groupByCategory(allTxs))
        setDailyDay(lastDay)
        setMonthlyMonth(lastMonth)
      } catch (err: unknown) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load transactions")
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [mainBookId, currentYear])

  // ── Split category data by sign ──
  const { expenses: dailyExpenses, income: dailyIncome } =
    splitBySign(dailyCategoryRows)
  const { expenses: monthlyExpenses, income: monthlyIncome } =
    splitBySign(monthlyCategoryRows)
  const { expenses: yearlyExpenses, income: yearlyIncome } =
    splitBySign(yearlyCategoryRows)

  // ── Computed display states ──
  const dailyPieTitle = dailyFormatPieTitle(dailyDay)
  const dailyHasPieData =
    Object.keys(dailyExpenses).length > 0 || Object.keys(dailyIncome).length > 0

  const monthlyPieTitle = monthlyFormatPieTitle(monthlyMonth)
  const monthlyHasPieData =
    Object.keys(monthlyExpenses).length > 0 || Object.keys(monthlyIncome).length > 0

  const yearlyPieTitle = `${currentYear}`
  const yearlyHasPieData =
    Object.keys(yearlyExpenses).length > 0 || Object.keys(yearlyIncome).length > 0

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2 px-4 items-stretch">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-2 px-4 items-stretch">
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive text-center">{error}</p>
        </div>
      </div>
    )
  }

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
        {dailyHasPieData ? (
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
        {monthlyHasPieData ? (
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
        {yearlyHasPieData ? (
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
