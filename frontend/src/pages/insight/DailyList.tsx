// ---------------------------------------------------------------------------
// DailyList — selectable list of daily net totals
// ---------------------------------------------------------------------------

import { useMemo } from "react"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"

import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { DailyReportRow } from "@/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyListProps {
  dailyTotals: DailyReportRow[]
  selectedDay: string | null // null = today
  isLoadingSelectedDay: boolean
  isLoadingDaily: boolean
  dailyError: string | null
  onSelectDay: (date: string | null) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const todayStr = new Date().toISOString().slice(0, 10)

function formatListDate(dateStr: string): string {
  if (dateStr === todayStr) return "Today"
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
  // Compute a stable list of all days (today first, then descending)
  const listDays = useMemo(() => {
    // dailyTotals is already filled (all 10 days present), sorted ascending
    const sorted = [...dailyTotals].sort((a, b) => b.date.localeCompare(a.date)) // newest first
    return sorted
  }, [dailyTotals])

  if (isLoadingDaily) {
    return (
      <div className="w-full space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg p-3">
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  if (dailyError) {
    return (
      <div className="flex h-48 w-full items-center justify-center rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
        {dailyError}
      </div>
    )
  }

  return (
    <div className="w-full">
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">Daily Net</h3>
      <div className="space-y-1">
        {listDays.map((row) => {
          const isSelected = (selectedDay === null && row.date === todayStr) || selectedDay === row.date
          const isLoading = isSelected && isLoadingSelectedDay && selectedDay !== null

          return (
            <button
              key={row.date}
              type="button"
              onClick={() => {
                if (row.date === todayStr) {
                  onSelectDay(null)
                } else {
                  onSelectDay(row.date)
                }
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/50",
                isSelected && "border-l-primary bg-accent",
              )}
              style={isSelected ? { borderLeftWidth: 3 } : undefined}
            >
              <span
                className={cn(
                  "font-medium",
                  row.date === todayStr && "text-primary",
                )}
              >
                {formatListDate(row.date)}
              </span>
              <span className="flex items-center gap-1.5 font-mono tabular-nums">
                {isLoading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
                <span
                  className={cn(
                    row.amount < 0
                      ? "text-destructive"
                      : row.amount > 0
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