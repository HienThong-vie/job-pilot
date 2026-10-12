"use client";

import {
  Bar,
  BarChart,
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

export function MatchScoreChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="4 4" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={AXIS_TICK}
          height={X_AXIS_HEIGHT}
          tickMargin={X_AXIS_TICK_MARGIN}
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
        <Bar dataKey="value" fill="var(--color-success)" barSize={32} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
