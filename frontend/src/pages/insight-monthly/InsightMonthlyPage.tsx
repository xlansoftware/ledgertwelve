// ---------------------------------------------------------------------------
// InsightMonthlyPage — monthly insight page with pie chart, area chart, and lists
// ---------------------------------------------------------------------------

import { Skeleton } from "@/components/ui/skeleton"
import { InsightComponent } from "@/pages/insight/InsightComponent"
import { MonthlyAreaChart } from "./MonthlyAreaChart"
import { MonthlyList } from "./MonthlyList"
import { YearList } from "./YearList"
import { useMonthlyInsight } from "./useMonthlyInsight"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCurrentMonthStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function formatMonthTitle(period: string): string {
  const [year, month] = period.split("-")
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return format(d, "MMM yyyy")
}

function formatPieTitle(pieMonth: string | null, isCurrentYear: boolean): string {
  if (pieMonth === null) return "—" // in-flight year switch; stale pie still visible
  if (isCurrentYear && pieMonth === getCurrentMonthStr()) return "This Month"
  return formatMonthTitle(pieMonth)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InsightMonthlyPage() {
  const navigate = useNavigate()

  const {
    expenses,
    income,
    isLoadingPie,

    accumulatedData,
    isLoadingMonthly,
    monthlyError,

    selectedMonth,
    pieMonth,

    monthlyTotals,
    selectMonth,

    chartAverage,
    chartEndValue,
    isCurrentYear,
    activeYear,

    years,
    yearNets,
    selectedYear,
    isLoadingYears,
    yearsError,
    selectYear,
  } = useMonthlyInsight()

  const pieTitle = formatPieTitle(pieMonth, isCurrentYear)
  const hasPieData = Object.keys(expenses).length > 0 || Object.keys(income).length > 0
  const showPieSkeleton = isLoadingPie && !hasPieData

  // For past years, the "selected" month shown on the chart/list is the
  // effective pie month (defaults to that year's last month with transactions).
  // For the current year the existing selectedMonth semantics are preserved.
  const displayedMonth = isCurrentYear ? selectedMonth : pieMonth

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4">
      <div className="relative -mb-10 z-10">
        <Button variant="outline" onClick={() => navigate("/insight")}><ArrowLeft /></Button>
      </div>

      {/* ── Pie Chart Section ── */}
      <section>
        {showPieSkeleton ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-64 w-64 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : hasPieData ? (
          <InsightComponent
            data={expenses}
            altData={income}
            title={pieTitle}
          />
        ) : (
          <InsightComponent
            data={{}}
            title={pieTitle}
          />
        )}
      </section>

      {/* ── Area Chart Section ── */}
      <section>
        <MonthlyAreaChart
          data={accumulatedData}
          isLoading={isLoadingMonthly}
          error={monthlyError}
          selectedMonth={displayedMonth}
          onSelectMonth={selectMonth}
          average={chartAverage ?? undefined}
          year={activeYear}
          endValue={chartEndValue ?? undefined}
          endLabel={isCurrentYear ? "Projected End" : "Year End"}
        />
      </section>

      {/* ── Monthly List Section ── */}
      <section>
        <MonthlyList
          monthlyTotals={monthlyTotals}
          selectedMonth={displayedMonth}
          isCurrentYear={isCurrentYear}
          isLoadingSelectedMonth={isLoadingPie}
          isLoadingMonthly={isLoadingMonthly}
          monthlyError={monthlyError}
          onSelectMonth={selectMonth}
        />
      </section>

      {/* ── Year List Section ── */}
      <section>
        <YearList
          years={years}
          yearNets={yearNets}
          selectedYear={selectedYear}
          isLoadingYears={isLoadingYears}
          yearsError={yearsError}
          onSelectYear={selectYear}
        />
      </section>
    </div>
  )
}
