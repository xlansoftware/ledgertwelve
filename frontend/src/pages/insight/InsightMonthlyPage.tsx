// ---------------------------------------------------------------------------
// InsightMonthlyPage — monthly insight page with pie chart, area chart, and list
// ---------------------------------------------------------------------------

import { Skeleton } from "@/components/ui/skeleton"
import { InsightComponent } from "@/pages/insight/InsightComponent"
import { MonthlyAreaChart } from "@/pages/insight/MonthlyAreaChart"
import { MonthlyList } from "@/pages/insight/MonthlyList"
import { useMonthlyInsight } from "@/pages/insight/useMonthlyInsight"
import { format } from "date-fns"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = new Date()
const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

function formatPieTitle(selectedMonth: string | null): string {
  if (selectedMonth === null) return "This Month"
  const [year, month] = selectedMonth.split("-")
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return format(d, "MMM yyyy")
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InsightMonthlyPage() {
  const {
    expenses,
    income,
    isLoadingPie,

    accumulatedData,
    isLoadingMonthly,
    monthlyError,

    selectedMonth,

    monthlyTotals,
    selectMonth,
  } = useMonthlyInsight()

  const pieTitle = formatPieTitle(selectedMonth)
  const hasPieData = Object.keys(expenses).length > 0 || Object.keys(income).length > 0
  const showPieSkeleton = isLoadingPie && !hasPieData

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Monthly Insight</h1>

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
          selectedMonth={selectedMonth}
          onSelectMonth={selectMonth}
        />
      </section>

      {/* ── Monthly List Section ── */}
      <section>
        <MonthlyList
          monthlyTotals={monthlyTotals}
          selectedMonth={selectedMonth}
          isLoadingSelectedMonth={isLoadingPie}
          isLoadingMonthly={isLoadingMonthly}
          monthlyError={monthlyError}
          onSelectMonth={selectMonth}
        />
      </section>
    </div>
  )
}