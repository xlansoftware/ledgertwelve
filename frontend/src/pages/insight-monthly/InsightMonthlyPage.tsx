// ---------------------------------------------------------------------------
// InsightMonthlyPage — monthly insight page with pie chart, area chart, and list
// ---------------------------------------------------------------------------

import { Skeleton } from "@/components/ui/skeleton"
import { InsightComponent } from "@/pages/insight/InsightComponent"
import { MonthlyAreaChart } from "./MonthlyAreaChart"
import { MonthlyList } from "./MonthlyList"
import { useMonthlyInsight } from "./useMonthlyInsight"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  const navigate = useNavigate()
  
  const {
    expenses,
    income,
    isLoadingPie,

    accumulatedData,
    isLoadingMonthly,
    monthlyError,

    selectedMonth,

    averageChange,
    monthlyTotals,
    selectMonth,
  } = useMonthlyInsight()

  const pieTitle = formatPieTitle(selectedMonth)
  const hasPieData = Object.keys(expenses).length > 0 || Object.keys(income).length > 0
  const showPieSkeleton = isLoadingPie && !hasPieData

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
          selectedMonth={selectedMonth}
          average={averageChange || undefined}
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