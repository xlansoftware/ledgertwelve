// ---------------------------------------------------------------------------
// MonthlyList — thin wrapper around PeriodList with month-specific formatting
// ---------------------------------------------------------------------------

import { useMemo } from "react"
import { format } from "date-fns"
import { PeriodList } from "@/pages/insight/PeriodList"
import type { MonthlyReportRow } from "@/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MonthlyListProps {
  monthlyTotals: MonthlyReportRow[]
  selectedMonth: string | null   // null = current month ("YYYY-MM")
  isLoadingSelectedMonth: boolean
  isLoadingMonthly: boolean
  monthlyError: string | null
  onSelectMonth: (month: string | null) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = new Date()
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

function formatLabel(period: string): string {
  // period = "YYYY-MM"
  const [year, month] = period.split("-")
  const d = new Date(parseInt(year), parseInt(month) - 1, 1)
  return format(d, "MMM")
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MonthlyList({
  monthlyTotals,
  selectedMonth,
  isLoadingSelectedMonth,
  isLoadingMonthly,
  monthlyError,
  onSelectMonth,
}: MonthlyListProps) {

  // Convert MonthlyReportRow[] to { period: string; amount: number }[]
  const periods = useMemo(
    () => monthlyTotals.map((row) => ({ period: row.period, amount: row.amount })),
    [monthlyTotals],
  )

  return (
    <PeriodList
      periods={periods}
      selectedPeriod={selectedMonth}
      currentPeriod={currentMonth}
      labelForCurrent="This Month"
      isLoadingPeriod={isLoadingSelectedMonth}
      isLoadingList={isLoadingMonthly}
      error={monthlyError}
      onSelect={onSelectMonth}
      formatLabel={formatLabel}
    />
  )
}