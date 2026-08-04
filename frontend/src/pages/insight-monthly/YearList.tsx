// ---------------------------------------------------------------------------
// YearList — thin wrapper around PeriodList showing years with transactions
// ---------------------------------------------------------------------------

import { useMemo } from "react"
import { PeriodList } from "@/pages/insight/PeriodList"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface YearListProps {
  years: string[] // "YYYY" strings — only years with transactions
  yearNets: Record<string, number> // year → yearly net amount
  selectedYear: string | null // null = most recent year with transactions
  isLoadingYears: boolean
  yearsError: string | null
  onSelectYear: (year: string | null) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function YearList({
  years,
  yearNets,
  selectedYear,
  isLoadingYears,
  yearsError,
  onSelectYear,
}: YearListProps) {
  const currentYear = String(new Date().getFullYear())

  // Convert to PeriodList periods; PeriodList sorts descending (newest first).
  const periods = useMemo(
    () => years.map((year) => ({ period: year, amount: yearNets[year] ?? 0 })),
    [years, yearNets],
  )

  // Empty (and not loading / not errored) → muted explanation instead of a list.
  if (years.length === 0 && !isLoadingYears && !yearsError) {
    return (
      <div className="w-full">
        <p className="text-sm text-muted-foreground">No transactions yet</p>
      </div>
    )
  }

  return (
    <PeriodList
      periods={periods}
      selectedPeriod={selectedYear}
      // The current-year row is primary-highlighted but labeled plainly —
      // year numbers are self-identifying. Clicking it returns to the default year.
      currentPeriod={currentYear}
      labelForCurrent={currentYear}
      isLoadingPeriod={false}
      isLoadingList={isLoadingYears}
      error={yearsError}
      onSelect={onSelectYear}
      formatLabel={(year) => year}
      listLabel="Yearly Net"
    />
  )
}
