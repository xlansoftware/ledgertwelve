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

  // Average period change over the historical period
  const count = accumulated.length

  const firstCumulative = sorted[0].cumulative
  const lastCumulative = sorted[sorted.length - 1].cumulative
  const avgDailyChange = (lastCumulative - firstCumulative) / count

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

/**
 * Compute a forward projection using an externally provided average change.
 * Used when the wide-window average API returns a value.
 * Falls back to computeProjection when the API is unavailable.
 *
 * @param lastCumulative - The cumulative balance at the last historical data point.
 * @param avgChange - The net average change per period (from the API).
 * @param M - Number of projected periods forward.
 * @param lastDate - The date string of the last historical data point.
 * @returns Projected data points with `isProjected: true`.
 */
export function computeProjectionFromAverage(
  lastCumulative: number,
  avgChange: number,
  M: number,
  lastDate: string,
): ProjectedRow[] {
  if (M <= 0) return []

  const projected: ProjectedRow[] = []
  const lastDateObj = new Date(lastDate)
  let cumulative = lastCumulative

  for (let i = 1; i <= M; i++) {
    const projectedDate = new Date(lastDateObj)
    projectedDate.setDate(projectedDate.getDate() + i)
    cumulative += avgChange

    projected.push({
      date: projectedDate.toISOString().slice(0, 10),
      daily: avgChange,
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