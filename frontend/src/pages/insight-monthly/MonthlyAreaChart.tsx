// ---------------------------------------------------------------------------
// MonthlyAreaChart — thin wrapper around PeriodAreaChart with month-specific formatting
// ---------------------------------------------------------------------------

import { format } from "date-fns"
import { PeriodAreaChart } from "@/pages/insight/PeriodAreaChart"
import type { AccumulatedRow, ProjectedRow } from "@/pages/insight/insightUtils"

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
  year: string // active year being viewed (e.g. "2024")
  endValue?: number // actual year-end balance for past years
  endLabel?: string // "Year End" for past years; defaults to "Projected End"
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
  year,
  endValue,
  endLabel = "Projected End",
}: MonthlyAreaChartProps) {
  const isCurrentYear = year === String(new Date().getFullYear())

  return (
    <PeriodAreaChart
      data={data}
      isLoading={isLoading}
      error={error}
      selectedPeriod={selectedMonth}
      onSelectPeriod={onSelectMonth}
      title={isCurrentYear ? "This Year" : year}
      formatLabel={formatLabel}
      formatTooltipLabel={formatTooltipLabel}
      deltaLabel="Monthly"
      balanceLabel="Balance"
      average={average}
      unitLabel="/mo"
      endValue={endValue}
      endLabel={endLabel}
    />
  )
}