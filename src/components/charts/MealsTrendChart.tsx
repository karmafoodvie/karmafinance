"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { CHART_GRID, CHART_AXIS_TEXT, CHART_TOOLTIP_BG, CHART_TOOLTIP_TEXT } from "@/lib/chartColors";
import { formatNumber } from "@/lib/calculations";

export interface TrendPoint {
  label: string;
  value: number;
}

// Gerettete Sackerl pro Monat — bewusst in Stück, nicht Euro, mit eigener
// Gelb-Farbe (Food-Waste-Thema), damit es sich klar von den Umsatz-Charts
// abhebt.
export function MealsTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          width={40}
          tickFormatter={(v) => formatNumber(v)}
        />
        <Tooltip
          formatter={(value) => [`${formatNumber(Number(value))} Sackerl`, ""]}
          contentStyle={{
            background: CHART_TOOLTIP_BG,
            border: "none",
            borderRadius: 10,
            color: CHART_TOOLTIP_TEXT,
            fontSize: 13,
          }}
          labelStyle={{ color: CHART_TOOLTIP_TEXT, fontWeight: 600 }}
        />
        <Bar dataKey="value" fill="#eda100" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
