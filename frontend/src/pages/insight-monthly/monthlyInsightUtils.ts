// ---------------------------------------------------------------------------
// Monthly insight utilities — pure, year-aware helpers (no side effects)
// ---------------------------------------------------------------------------

import type { MonthlyReportRow } from "@/types"

/**
 * Fill gaps in a year's monthly totals so every month is present.
 *
 * - Current year: fills January → `currentMonth` (inclusive).
 * - Past years: fills all 12 months (Jan–Dec).
 *
 * Missing months are zero-filled. Periods outside `year` are discarded.
 */
export function fillYearMonths(
  rows: MonthlyReportRow[],
  year: string,
  isCurrentYear: boolean,
  currentMonth: number,
): MonthlyReportRow[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    if (row.period.startsWith(`${year}-`)) {
      map.set(row.period, row.amount)
    }
  }

  const lastMonth = isCurrentYear ? currentMonth : 12
  const filled: MonthlyReportRow[] = []
  for (let m = 1; m <= lastMonth; m++) {
    const key = `${year}-${String(m).padStart(2, "0")}`
    filled.push({
      period: key,
      amount: map.get(key) ?? 0,
    })
  }

  return filled
}

/**
 * The highest "YYYY-MM" period present in `rows` for the given year,
 * or `null` if the year has no months with transactions.
 */
export function lastMonthWithTransactions(
  rows: MonthlyReportRow[],
  year: string,
): string | null {
  let last: string | null = null
  for (const row of rows) {
    if (row.period.startsWith(`${year}-`)) {
      if (last === null || row.period > last) {
        last = row.period
      }
    }
  }
  return last
}

/**
 * Year-level statistics derived from that year's monthly rows.
 *
 * - `averageMonthlyNet`: sum of the year's monthly nets divided by the count
 *   of months with transactions (months without transactions are excluded
 *   from the divisor — consistent with the average endpoint semantics).
 * - `yearEndNet`: sum of the year's monthly nets (the accumulated curve's
 *   last point, since the seed is zero).
 */
export function yearStats(
  rows: MonthlyReportRow[],
  year: string,
): { averageMonthlyNet: number; yearEndNet: number } {
  let sum = 0
  let count = 0

  for (const row of rows) {
    if (row.period.startsWith(`${year}-`)) {
      sum += row.amount
      count += 1
    }
  }

  const averageMonthlyNet =
    count > 0 ? Math.round((sum / count) * 100) / 100 : 0
  return {
    averageMonthlyNet,
    yearEndNet: Math.round(sum * 100) / 100,
  }
}

/**
 * Resolve the default active year: the most recent year with transactions,
 * or `currentYear` when the list is empty (still loading / no data).
 */
export function resolveDefaultYear(
  years: string[],
  currentYear: string,
): string {
  if (years.length === 0) return currentYear
  return [...years].sort((a, b) => b.localeCompare(a))[0]
}
