// ---------------------------------------------------------------------------
// DailyList — thin wrapper around PeriodList with day-specific formatting
// ---------------------------------------------------------------------------

import { useMemo } from "react"
import { format } from "date-fns"
import { PeriodList } from "@/pages/insight/PeriodList"
import type { DailyReportRow } from "@/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyListProps {
  dailyTotals: DailyReportRow[]
  selectedDay: string | null   // null = today
  isLoadingSelectedDay: boolean
  isLoadingDaily: boolean
  dailyError: string | null
  onSelectDay: (date: string | null) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const todayStr = new Date().toISOString().slice(0, 10)

function formatLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return format(d, "EEE d")
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DailyList({
  dailyTotals,
  selectedDay,
  isLoadingSelectedDay,
  isLoadingDaily,
  dailyError,
  onSelectDay,
}: DailyListProps) {

  // Convert DailyReportRow[] to { period: string; amount: number }[]
  const periods = useMemo(
    () => dailyTotals.map((row) => ({ period: row.date, amount: row.amount })),
    [dailyTotals],
  )

  return (
    <PeriodList
      periods={periods}
      selectedPeriod={selectedDay}
      currentPeriod={todayStr}
      labelForCurrent="Today"
      isLoadingPeriod={isLoadingSelectedDay}
      isLoadingList={isLoadingDaily}
      error={dailyError}
      onSelect={onSelectDay}
      formatLabel={formatLabel}
    />
  )
}