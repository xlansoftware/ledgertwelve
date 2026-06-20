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
    todayExpenses,
    todayIncome,
    isLoadingToday,
    todayError,

    accumulatedData,
    isLoadingDaily,
    dailyError,

    selectedDay,
    selectedDayExpenses,
    selectedDayIncome,
    isLoadingSelectedDay,

    dailyTotals,
    selectDay,
  } = useDailyInsight()

  // Determine which data to show in the pie chart
  const pieExpenses = selectedDay === null ? todayExpenses : selectedDayExpenses
  const pieIncome = selectedDay === null ? todayIncome : selectedDayIncome
  const pieIsLoading = selectedDay === null ? isLoadingToday : isLoadingSelectedDay
  const pieError = selectedDay === null ? todayError : null
  const pieTitle = formatPieTitle(selectedDay)

  // Show the pie data while loading a new selection (no flicker)
  const hasPieData = Object.keys(pieExpenses).length > 0 || Object.keys(pieIncome).length > 0
  const showPieSkeleton = pieIsLoading && !hasPieData

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
        ) : pieError ? (
          <div className="flex h-48 w-full items-center justify-center rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
            {pieError}
          </div>
        ) : hasPieData ? (
          <InsightComponent
            data={pieExpenses}
            altData={pieIncome}
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
        />
      </section>

      {/* ── Daily List Section ── */}
      <section>
        <DailyList
          dailyTotals={dailyTotals}
          selectedDay={selectedDay}
          isLoadingSelectedDay={isLoadingSelectedDay}
          isLoadingDaily={isLoadingDaily}
          dailyError={dailyError}
          onSelectDay={selectDay}
        />
      </section>
    </div>
  )
}