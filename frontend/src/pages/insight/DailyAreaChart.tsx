// ---------------------------------------------------------------------------
// DailyAreaChart — accumulated daily spending area chart with projection
// ---------------------------------------------------------------------------

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { format } from "date-fns"

import { ChartContainer } from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"
import type { AccumulatedRow, ProjectedRow } from "./insightUtils"

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: AccumulatedRow | ProjectedRow }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const item = payload[0]
  const dataPoint = item.payload
  const isProjected = "isProjected" in dataPoint && dataPoint.isProjected
  const prefix = isProjected ? "Projected: " : ""

  return (
    <div className="grid min-w-32 items-start gap-1.5 bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
      <span className="text-muted-foreground">
        {formatTooltipDate(dataPoint.date)}
      </span>
      <span className="font-medium">
        {prefix}Daily: {formatCurrency(dataPoint.daily)}
      </span>
      <span className="font-medium">
        {prefix}Total: {formatCurrency(dataPoint.cumulative)}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyAreaChartProps {
  data: (AccumulatedRow | ProjectedRow)[]
  isLoading: boolean
  error: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return format(d, "EEE d")
}

function formatTooltipDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return format(d, "EEE, MMM d")
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DailyAreaChart({ data, isLoading, error }: DailyAreaChartProps) {
  const hasData = data.length > 0 && !isLoading && !error

  // Build chart config for the two series
  const chartConfig = {
    historical: {
      label: "Accumulated",
      color: "hsl(var(--primary))",
    },
    projected: {
      label: "Projected",
      color: "hsl(var(--muted-foreground))",
    },
  }

  if (isLoading) {
    return (
      <div className="w-full space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-48 w-full animate-pulse rounded bg-muted" />
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

  // If no data, show a flat line at zero
  const chartData = hasData
    ? data
    : [{ date: "", daily: 0, cumulative: 0, isProjected: false as const }]

  return (
    <div className="w-full">
      <h3 className="mb-2 text-sm font-medium text-muted-foreground">
        Accumulated Spending (Last 10 Days)
      </h3>
      <div className="h-52 w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              fontSize={11}
            />
            <YAxis
              tickFormatter={(v: number) => `${v}`}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              fontSize={11}
              width={40}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={false}
            />

            {/* Historical area */}
            <defs>
              <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>

            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#historicalGradient)"
              dot={false}
              activeDot={{ r: 4, stroke: "hsl(var(--primary))", strokeWidth: 2, fill: "white" }}
              isAnimationActive={false}
            />

            {/* Projected line (only when data has projected points) */}
            {hasData && data.some((d) => "isProjected" in d && d.isProjected) && (
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="none"
                dot={false}
                activeDot={{ r: 4, stroke: "hsl(var(--muted-foreground))", strokeWidth: 2, fill: "white" }}
                isAnimationActive={false}
                connectNulls={false}
              />
            )}
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  )
}