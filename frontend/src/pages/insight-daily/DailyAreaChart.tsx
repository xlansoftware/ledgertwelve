// ---------------------------------------------------------------------------
// DailyAreaChart — thin wrapper around PeriodAreaChart with day-specific formatting
// ---------------------------------------------------------------------------

import { format } from "date-fns"
import { PeriodAreaChart } from "@/pages/insight/PeriodAreaChart"
import type { AccumulatedRow, ProjectedRow } from "@/pages/insight/insightUtils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyAreaChartProps {
  data: (AccumulatedRow | ProjectedRow)[]
  isLoading: boolean
  error: string | null
  selectedDay?: string | null
  onSelectDay?: (date: string) => void
  average?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return format(d, "EEE d")
}

function formatTooltipLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return format(d, "EEE, MMM d")
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DailyAreaChart({
  data,
  isLoading,
  error,
  selectedDay,
  onSelectDay,
  average,
}: DailyAreaChartProps) {
  return (
    <PeriodAreaChart
      data={data}
      isLoading={isLoading}
      error={error}
      selectedPeriod={selectedDay}
      onSelectPeriod={onSelectDay}
      title="This Month"
      formatLabel={formatLabel}
      formatTooltipLabel={formatTooltipLabel}
      deltaLabel="Daily"
      balanceLabel="Balance"
      average={average}
      unitLabel="/day"
    />
  )
}