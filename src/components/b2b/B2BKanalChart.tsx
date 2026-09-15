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
import { B2B_CHANNELS, B2B_DATA } from "@/lib/b2bData";

const fmtK = (v: number) =>
  v >= 1000
    ? `€ ${Math.round(v / 1000).toLocaleString("de-AT")}k`
    : `€ ${Math.round(v)}`;

const fmtFull = (v: number) => `€ ${Math.round(v).toLocaleString("de-AT")}`;

export function B2BKanalChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={B2B_DATA} margin={{ top: 4, right: 4, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,26,26,0.06)" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: "#999" }}
          angle={-40}
          textAnchor="end"
          interval={1}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#999" }}
          tickFormatter={fmtK}
          width={52}
        />
        <Tooltip
          formatter={(value, name) => [
            typeof value === "number" ? fmtFull(value) : String(value),
            String(name),
          ]}
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid rgba(26,26,26,0.1)",
            fontSize: 12,
          }}
        />
        <Legend
          wrapperStyle={{ paddingTop: 8, fontSize: 11 }}
          iconType="circle"
          iconSize={8}
        />
        {B2B_CHANNELS.map((ch) => (
          <Bar
            key={ch.key}
            dataKey={ch.key}
            name={ch.label}
            stackId="a"
            fill={ch.color}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
