// ---------------------------------------------------------------------------
// Insight utilities — pure functions for data transformation
// ---------------------------------------------------------------------------

export interface AccumulatedRow {
  date: string
  daily: number
  cumulative: number
  isProjected?: false
}

export interface ProjectedRow {
  date: string
  daily: number
  cumulative: number
  isProjected: true
}

export interface ChartDataRow {
  date: string
  delta: number
  historical: number | null
  projected: number | null
}

/**
 * Compute running accumulation from raw daily totals.
 *
 * Uses actual financial semantics:
 *   cumulative += row.amount
 * Expenses (negative) decrease the balance; income (positive) increases it.
 *
 * @param initialCumulative - Optional seed value for the starting cumulative balance.
 *                            Defaults to 0 when omitted.
 */
export function computeAccumulation(
  rows: { date: string; amount: number }[],
  initialCumulative?: number,
): AccumulatedRow[] {
  if (rows.length === 0) return []

  // Sort by date ascending
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))

  let cumulative = initialCumulative ?? 0
  return sorted.map((row) => {
    cumulative += row.amount
    return {
      date: row.date,
      daily: row.amount,
      cumulative: Math.round(cumulative * 100) / 100,
    }
  })
}

/**
 * Compute a forward projection based on average daily change.
 *
 * @param accumulated - The accumulated historical data points.
 * @param M - Number of projected days forward.
 * @returns Projected data points with `isProjected: true`.
 */
export function computeProjection(
  accumulated: { date: string; cumulative: number }[],
  M: number,
): ProjectedRow[] {
  if (accumulated.length < 2) return []

  const sorted = [...accumulated].sort((a, b) => a.date.localeCompare(b.date))

  // Average daily change over the historical period
  const firstDate = new Date(sorted[0].date)
  const lastDate = new Date(sorted[sorted.length - 1].date)
  const dayCount = Math.max(
    1,
    Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)),
  )

  const firstCumulative = sorted[0].cumulative
  const lastCumulative = sorted[sorted.length - 1].cumulative
  const avgDailyChange = (lastCumulative - firstCumulative) / dayCount

  // Build projected points
  const projected: ProjectedRow[] = []
  const lastKnownDate = new Date(sorted[sorted.length - 1].date)
  let cumulative = lastCumulative

  for (let i = 1; i <= M; i++) {
    const projectedDate = new Date(lastKnownDate)
    projectedDate.setDate(projectedDate.getDate() + i)
    cumulative += avgDailyChange

    projected.push({
      date: projectedDate.toISOString().slice(0, 10),
      daily: avgDailyChange,
      cumulative: Math.round(cumulative * 100) / 100,
      isProjected: true,
    })
  }

  return projected
}


export function computeChartData(data: (AccumulatedRow | ProjectedRow)[]) : ChartDataRow[] {
  const chartData = data.map((row) => ({
    date: row.date,
    delta: row.daily,
    historical:
      "isProjected" in row && row.isProjected
        ? null
        : row.cumulative,
    projected:
      "isProjected" in row && row.isProjected
        ? row.cumulative
        : null,
  }))

  const lastHistoricalIndex = data.findIndex(
    (d) => "isProjected" in d && d.isProjected
  )

  if (lastHistoricalIndex > 0) {
    const previous = data[lastHistoricalIndex - 1]

    chartData.splice(lastHistoricalIndex, 0, {
      date: previous.date,
      delta: previous.daily,
      historical: previous.cumulative,
      projected: previous.cumulative,
    })
  }

  return chartData;
}