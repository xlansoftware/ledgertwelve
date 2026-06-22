// ---------------------------------------------------------------------------
// InsightDailyPage — daily insight page with pie chart, area chart, and list
// ---------------------------------------------------------------------------

import { Skeleton } from "@/components/ui/skeleton"
import { InsightComponent } from "@/pages/insight/InsightComponent"
import { DailyAreaChart } from "@/pages/insight/DailyAreaChart"
import { DailyList } from "@/pages/insight/DailyList"
import { useDailyInsight } from "@/pages/insight/useDailyInsight"
import { format } from "date-fns"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPieTitle(selectedDay: string | null): string {
  if (selectedDay === null) return "Today"
  const d = new Date(selectedDay + "T00:00:00")
  return format(d, "EEE, MMM d")
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InsightDailyPage() {
  const {
    expenses,
    income,
    isLoadingPie,

    accumulatedData,
    isLoadingDaily,
    dailyError,

    selectedDay,

    averageChange,
    dailyTotals,
    selectDay,
  } = useDailyInsight()

  const pieTitle = formatPieTitle(selectedDay)
  const hasPieData = Object.keys(expenses).length > 0 || Object.keys(income).length > 0
  const showPieSkeleton = isLoadingPie && !hasPieData

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-bold">Daily Insight</h1>

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
        <DailyAreaChart
          data={accumulatedData}
          isLoading={isLoadingDaily}
          error={dailyError}
          selectedDay={selectedDay}
          average={averageChange || undefined}
          onSelectDay={selectDay}
        />
      </section>

      {/* ── Daily List Section ── */}
      <section>
        <DailyList
          dailyTotals={dailyTotals}
          selectedDay={selectedDay}
          isLoadingSelectedDay={isLoadingPie}
          isLoadingDaily={isLoadingDaily}
          dailyError={dailyError}
          onSelectDay={selectDay}
        />
      </section>
    </div>
  )
}