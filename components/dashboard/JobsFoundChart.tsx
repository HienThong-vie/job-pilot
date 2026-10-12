"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import {
  AXIS_TICK,
  CHART_MARGIN,
  GRID_STROKE,
  X_AXIS_HEIGHT,
  X_AXIS_TICK_MARGIN,
  Y_AXIS_TICK_MARGIN,
  Y_AXIS_WIDTH,
} from "@/lib/chart-theme";
import type { ChartPoint } from "@/types";

type Props = {
  data: ChartPoint[];
};

const FILL_ID = "jobs-found-fill";

export function JobsFoundChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={CHART_MARGIN}>
        <defs>
          <linearGradient id={FILL_ID} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.2} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={AXIS_TICK}
          height={X_AXIS_HEIGHT}
          tickMargin={X_AXIS_TICK_MARGIN}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={AXIS_TICK}
          width={Y_AXIS_WIDTH}
          tickMargin={Y_AXIS_TICK_MARGIN}
          tickCount={5}
          allowDecimals={false}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--color-accent)"
          strokeWidth={3}
          fill={`url(#${FILL_ID})`}
          dot={false}
          activeDot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
