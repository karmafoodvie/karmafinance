"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  CHART_SERIES,
  CHART_GRID,
  CHART_AXIS_TEXT,
  CHART_TOOLTIP_BG,
  CHART_TOOLTIP_TEXT,
} from "@/lib/chartColors";
import { formatEur } from "@/lib/calculations";

export interface LocationTrendPoint {
  label: string;
  [locationKey: string]: string | number;
}

// Gruppierte Balken pro Standort über Zeit — Farben/Reihenfolge kommen von
// außen (keys), damit die Legende immer zur selben Standort-Farbe passt.
export function TgtgLocationTrendChart({
  data,
  keys,
}: {
  data: LocationTrendPoint[];
  keys: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
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
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: CHART_AXIS_TEXT }}
        />
        {keys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={CHART_SERIES[i % CHART_SERIES.length]}
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
