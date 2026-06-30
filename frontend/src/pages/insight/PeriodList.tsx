// ---------------------------------------------------------------------------
// PeriodList — generic selectable period list (granularity-agnostic)
// ---------------------------------------------------------------------------

import { Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/my-utils"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PeriodListProps {
  periods: { period: string; amount: number }[]
  selectedPeriod: string | null    // null = "current" (today / this month)
  currentPeriod: string            // ISO period string for "current" detection
  labelForCurrent: string          // e.g. "Today" or "This Month"
  isLoadingPeriod: boolean
  isLoadingList: boolean
  error: string | null
  onSelect: (period: string | null) => void
  formatLabel: (period: string) => string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PeriodList({
  periods,
  selectedPeriod,
  currentPeriod,
  labelForCurrent,
  isLoadingPeriod,
  isLoadingList,
  error,
  onSelect,
  formatLabel,
}: PeriodListProps) {

  // Sort periods newest-first
  const sorted = [...periods].sort((a, b) => b.period.localeCompare(a.period))

  if (isLoadingList) {
    return (
      <div className="w-full space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg p-3">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div className="w-full">
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
        {labelForCurrent === "Today" ? "Daily Net" : "Monthly Net"}
      </h3>
      <div className="space-y-1">
        {sorted.map((row) => {
          const isCurrent = row.period === currentPeriod
          const isSelected =
            (selectedPeriod === null && isCurrent) || selectedPeriod === row.period
          const isLoading = isSelected && isLoadingPeriod && selectedPeriod !== null

          return (
            <button
              key={row.period}
              type="button"
              onClick={() => {
                if (isCurrent) {
                  onSelect(null)
                } else {
                  onSelect(row.period)
                }
              }}
              className={cn(
                "flex w-full items-center justify-between border border-transparent px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/50",
                isSelected && "border-primary bg-accent",
              )}
              style={isSelected ? { borderWidth: 1 } : undefined}
            >
              <span
                className={cn(
                  "font-medium",
                  isCurrent && "text-primary",
                )}
              >
                {isCurrent ? labelForCurrent : formatLabel(row.period)}
              </span>
              <span className="flex items-center gap-1.5 font-mono tabular-nums">
                {isLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
                <span
                  className={cn(
                    row.amount > 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground",
                  )}
                >
                  {formatCurrency(row.amount)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
