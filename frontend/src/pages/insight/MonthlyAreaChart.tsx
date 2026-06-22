// ---------------------------------------------------------------------------
// MonthlyAreaChart — thin wrapper around PeriodAreaChart with month-specific formatting
// ---------------------------------------------------------------------------

import { format } from "date-fns"
import { PeriodAreaChart } from "./PeriodAreaChart"
import type { AccumulatedRow, ProjectedRow } from "./insightUtils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MonthlyAreaChartProps {
  data: (AccumulatedRow | ProjectedRow)[]
  isLoading: boolean
  error: string | null
  selectedMonth?: string | null
  onSelectMonth?: (month: string) => void
  average?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLabel(period: string): string {
  // period = "YYYY-MM"
  const [year, month] = period.split("-")
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return format(d, "MMM")
}

function formatTooltipLabel(period: string): string {
  // period = "YYYY-MM"
  const [year, month] = period.split("-")
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return format(d, "MMM yyyy")
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MonthlyAreaChart({
  data,
  isLoading,
  error,
  selectedMonth,
  onSelectMonth,
  average,
}: MonthlyAreaChartProps) {
  return (
    <PeriodAreaChart
      data={data}
      isLoading={isLoading}
      error={error}
      selectedPeriod={selectedMonth}
      onSelectPeriod={onSelectMonth}
      title="Year-to-Date Running Balance"
      formatLabel={formatLabel}
      formatTooltipLabel={formatTooltipLabel}
      deltaLabel="Monthly"
      balanceLabel="Balance"
      average={average}
      unitLabel="/mo"
    />
  )
}