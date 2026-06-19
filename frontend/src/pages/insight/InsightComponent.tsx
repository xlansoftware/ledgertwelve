import React, { type ReactNode, useMemo } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  Label,
  Pie,
  PieChart,
  type PieLabelRenderProps,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { formatCurrency } from "@/lib/utils";
import { iconMap } from "@/lib/getIcon";
import { useCategoriesStore } from "@/store";
import { type CategoryDto } from "@/types/dto";

export interface InsightComponentProps {
  data: Record<string, number>;
  altData?: Record<string, number>;
  title: string;
  children?: ReactNode;
}

type IconComponent = React.ComponentType<
  React.SVGProps<SVGSVGElement>
>;

type ChartDatum = {
  name: string;
  value: number;
  fill: string;
  icon: IconComponent;
};

type LabelProps = PieLabelRenderProps & {
  payload?: ChartDatum;
};

function renderIconLabel({
  cx,
  cy,
  midAngle,
  outerRadius,
  payload,
}: LabelProps) {
  if (
    cx == null ||
    cy == null ||
    midAngle == null ||
    outerRadius == null
  ) {
    return null;
  }

  const Icon = payload?.icon ?? MoreHorizontal;

  const RADIAN = Math.PI / 180;

  const x =
    cx +
    (outerRadius + 20) *
      Math.cos(-midAngle * RADIAN);

  const y =
    cy +
    (outerRadius + 20) *
      Math.sin(-midAngle * RADIAN);

  return (
    <Icon
      x={x - 10}
      y={y - 10}
      width={20}
      height={20}
    />
  );
}

export function InsightComponent({
  data,
  altData,
  title,
  children,
}: InsightComponentProps) {
  const categories = useCategoriesStore(
    (s) => s.categories
  );

  const categoriesByName = useMemo(
    () =>
      categories.reduce(
        (acc, category) => {
          acc[category.name] = category;
          return acc;
        },
        {} as Record<string, CategoryDto>
      ),
    [categories]
  );

  const chartData = useMemo<ChartDatum[]>(
    () =>
      Object.entries(data).map(([name, value]) => ({
        name,
        value,
        fill:
          categoriesByName[name]?.color ??
          "#8884d8",
        icon:
          iconMap[
            categoriesByName[name]?.icon ?? ""
          ] ?? MoreHorizontal,
      })),
    [data, categoriesByName]
  );

  const altChartData = useMemo<
    ChartDatum[] | undefined
  >(
    () =>
      altData
        ? Object.entries(altData).map(
            ([name, value]) => ({
              name,
              value,
              fill:
                categoriesByName[name]?.color ??
                "#8884d8",
              icon:
                iconMap[
                  categoriesByName[name]?.icon ??
                    ""
                ] ?? MoreHorizontal,
            })
          )
        : undefined,
    [altData, categoriesByName]
  );

  const totalValue = useMemo(
    () =>
      chartData.reduce(
        (sum, item) => sum + item.value,
        0
      ),
    [chartData]
  );

  const altTotalValue = useMemo(
    () =>
      altChartData?.reduce(
        (sum, item) => sum + item.value,
        0
      ) ?? 0,
    [altChartData]
  );

  const chartConfig = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        chartData.map((item) => [
          item.name,
          {
            label: item.name,
            color: item.fill,
          },
        ])
      ),
    [chartData]
  );

  const {
    startAngle,
    endAngle,
    altStartAngle,
    altEndAngle,
  } = useMemo(
    () =>
      computeAngles(
        totalValue,
        altTotalValue
      ),
    [totalValue, altTotalValue]
  );

  const innerRadius =
    altTotalValue === 0 ? 60 : 70;

  const altInnerRadius = 60;
  const altSize = 20;

  if (chartData.length === 0) {
    return (
      <div className="w-full">
        <p className="text-muted-foreground text-center">
          &nbsp;
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative flex h-64 w-full flex-row">
        <ChartContainer
          config={chartConfig}
          className="h-full w-full"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent />
              }
            />

            {altChartData && (
              <Pie
                isAnimationActive={false}
                data={altChartData}
                dataKey="value"
                nameKey="name"
                label={renderIconLabel}
                startAngle={altStartAngle}
                endAngle={altEndAngle}
                innerRadius={altInnerRadius}
                outerRadius={
                  altInnerRadius + altSize
                }
                paddingAngle={5}
              />
            )}

            <Pie
              isAnimationActive={false}
              data={chartData}
              dataKey="value"
              nameKey="name"
              label={renderIconLabel}
              labelLine={false}
              startAngle={startAngle}
              endAngle={endAngle}
              innerRadius={innerRadius}
              paddingAngle={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (
                    !viewBox ||
                    !("cx" in viewBox) ||
                    !("cy" in viewBox)
                  ) {
                    return null;
                  }

                  const cx = viewBox.cx;
                  const cy = viewBox.cy;

                  return (
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      <tspan
                        x={cx}
                        y={
                          altTotalValue
                            ? cy - 12
                            : cy
                        }
                        className="fill-foreground text-3xl font-bold"
                      >
                        {formatCurrency(
                          totalValue,
                          0
                        )}
                      </tspan>

                      {altTotalValue > 0 && (
                        <tspan
                          x={cx}
                          y={cy + 12}
                          className="fill-muted-foreground text-sm font-bold"
                        >
                          (
                          {formatCurrency(
                            altTotalValue,
                            0
                          )}
                          )
                        </tspan>
                      )}

                      <tspan
                        x={cx}
                        y={
                          altTotalValue
                            ? cy + 36
                            : cy + 24
                        }
                        className="fill-muted-foreground"
                      >
                        {title}
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        {children}
      </div>
    </div>
  );
}

function computeAngles(
  value: number,
  altValue: number
) {
  if (value === 0 && altValue === 0) {
    return {
      startAngle: 0,
      endAngle: 360,
      altStartAngle: 0,
      altEndAngle: 0,
    };
  }

  const total = value + altValue;

  const startAngle = 0;
  const endAngle = (value / total) * 360;

  const altStartAngle = endAngle + 5;

  const altEndAngle =
    altStartAngle +
    (altValue / total) * 360 -
    10;

  return {
    startAngle,
    endAngle,
    altStartAngle,
    altEndAngle,
  };
}