// ---------------------------------------------------------------------------
// PeriodAreaChart — generic accumulated area chart (granularity-agnostic)
// ---------------------------------------------------------------------------

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  ReferenceLine,
} from "recharts"

import { ChartContainer } from "@/components/ui/chart"
import { formatCompactNumber, formatCurrency } from "@/lib/utils"
import {
  computeChartData,
  type AccumulatedRow,
  type ChartDataRow,
  type ProjectedRow,
} from "./insightUtils"

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: ChartDataRow }>
  formatTooltipLabel: (period: string) => string
  deltaLabel: string
  balanceLabel: string
}

function CustomTooltip({
  active,
  payload,
  formatTooltipLabel,
  deltaLabel,
  balanceLabel,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const item = payload[0]
  const dataPoint = item.payload
  const isProjected = dataPoint.projected !== null
  const prefix = isProjected ? "Projected: " : ""

  return (
    <div className="grid min-w-32 items-start gap-1.5 bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-sm ring-1 ring-foreground/10">
      <span className="text-muted-foreground">
        {formatTooltipLabel(dataPoint.date)}
      </span>
      <span className="font-medium">
        {prefix}{deltaLabel}: {formatCurrency(dataPoint.delta)}
      </span>
      <span className="font-medium">
        {prefix}{balanceLabel}: {formatCurrency(dataPoint.historical ?? dataPoint.projected ?? 0)}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PeriodAreaChartProps {
  data: (AccumulatedRow | ProjectedRow)[]
  isLoading: boolean
  error: string | null
  selectedPeriod?: string | null
  onSelectPeriod?: (period: string) => void
  title: string
  formatLabel: (period: string) => string        // X-axis tick labels
  formatTooltipLabel: (period: string) => string  // Tooltip date/period label
  deltaLabel?: string                             // Label for the delta line (default: "Daily")
  balanceLabel?: string                           // Label for the balance line (default: "Balance")
  average?: number                                // Average change per period (shown above chart)
  unitLabel?: string                              // Unit label for values (e.g. "/mo", "/day")
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PeriodAreaChart({
  data,
  isLoading,
  error,
  selectedPeriod,
  onSelectPeriod,
  title,
  formatLabel,
  formatTooltipLabel,
  deltaLabel = "Daily",
  balanceLabel = "Balance",
  average,
  unitLabel = "",
}: PeriodAreaChartProps) {

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

  const chartData = computeChartData(data)

  // Derived summary values shown above the chart
  // const beginningValue =
  //   chartData.length > 0 && chartData[0]?.historical && chartData[0]?.delta
  //     ? chartData[0].historical - chartData[0].delta
  //     : null
  const endValue =
    chartData.length > 0
      ? chartData[chartData.length - 1].projected ??
        chartData[chartData.length - 1].historical
      : null

  return (
    <div className="w-full">
      {/* Summary header — shadcn style with beginning, end, and average */}
      <div className="mb-3 flex items-center text-xs">
        {/* <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground">Beginning</span>
          <span className="text-base font-bold tabular-nums text-foreground">
            {beginningValue !== null ? formatCurrency(beginningValue) : "—"}
          </span>
        </div> */}
        <div className="flex-1 px-3 py-2">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">{title}</h3>
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-2 border">
          <span className="text-muted-foreground">
            Average{unitLabel ?? ""}
          </span>
          <span className="text-base font-bold tabular-nums text-foreground">
            {average !== undefined ? formatCurrency(average) : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 px-3 py-2 border">
          <span className="text-muted-foreground">Projected End</span>
          <span className="text-base font-bold tabular-nums text-foreground">
            {endValue !== null ? formatCurrency(endValue) : "—"}
          </span>
        </div>
      </div>

      <div className="h-52 w-full">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
            onClick={(e) => {
              if (!e?.activeLabel) return
              const period = String(e?.activeLabel)
              if (period && onSelectPeriod) {
                onSelectPeriod(period)
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatLabel}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              fontSize={11}
            />
            <YAxis
              tickFormatter={(v: number) => `${formatCompactNumber(v)}`}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              fontSize={11}
              width={40}
              reversed={true}
            />
            <Tooltip
              content={
                <CustomTooltip
                  formatTooltipLabel={formatTooltipLabel}
                  deltaLabel={deltaLabel}
                  balanceLabel={balanceLabel}
                />
              }
              cursor={false}
            />

            {/* Historical area */}
            <defs>
              <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>

            <Area
              type="step"
              dataKey="historical"
              strokeWidth={2}
              fill="url(#histGradient)"
              dot={false}
              isAnimationActive={false}
            />

            {/* Projected line */}
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#ff0000"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Vertical reference line for selected period */}
            {selectedPeriod && (
              <ReferenceLine
                x={chartData.findIndex((d) => d.date === selectedPeriod)}
                stroke="#ff0000"
                strokeWidth={2}
                strokeOpacity={0.6}
              />
            )}
          </AreaChart>
        </ChartContainer>
      </div>
    </div>
  )
}
