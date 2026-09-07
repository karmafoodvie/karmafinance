"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";
import { CHART_SERIES, CHART_GRID, CHART_AXIS_TEXT, CHART_TOOLTIP_BG, CHART_TOOLTIP_TEXT } from "@/lib/chartColors";
import { formatEur } from "@/lib/calculations";

export interface LocationBarPoint {
  label: string;
  value: number;
}

export function LocationBarChart({ data }: { data: LocationBarPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 32, bottom: 0, left: 8 }}>
        <CartesianGrid horizontal={false} stroke={CHART_GRID} />
        <XAxis
          type="number"
          tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatEur(v)}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: "#1b1b14" }}
          axisLine={false}
          tickLine={false}
          width={140}
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
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v) => formatEur(Number(v))}
            style={{ fontSize: 12, fill: "#1b1b14", fontWeight: 500 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
