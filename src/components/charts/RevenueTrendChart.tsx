"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { CHART_GRID, CHART_AXIS_TEXT, CHART_TOOLTIP_BG, CHART_TOOLTIP_TEXT } from "@/lib/chartColors";
import { formatEur } from "@/lib/calculations";

export interface TrendPoint {
  label: string;
  value: number;
}

export function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4ff3f" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#d4ff3f" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART_GRID} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }}
          axisLine={{ stroke: CHART_GRID }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v) => formatEur(v)}
        />
        <Tooltip
          formatter={(value) => formatEur(Number(value), true)}
          contentStyle={{
            background: CHART_TOOLTIP_BG,
            border: "none",
            borderRadius: 10,
            color: CHART_TOOLTIP_TEXT,
            fontSize: 13,
          }}
          labelStyle={{ color: CHART_TOOLTIP_TEXT, fontWeight: 600 }}
          itemStyle={{ color: CHART_TOOLTIP_TEXT }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#1b1b14"
          strokeWidth={2}
          fill="url(#revenueFill)"
          activeDot={{ r: 5, fill: "#1b1b14" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
