"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipContentProps,
} from "recharts";
import {
  CHART_GRID,
  CHART_AXIS_TEXT,
  CHART_TOOLTIP_BG,
  CHART_TOOLTIP_TEXT,
} from "@/lib/chartColors";
import { formatEur, formatNumber } from "@/lib/calculations";

export interface MonatsChartChannel {
  key: string;
  label: string;
  color: string;
  hasQuantity: boolean;
}

function ProduktTooltip({
  active,
  payload,
  label,
  channels,
}: TooltipContentProps & { channels: MonatsChartChannel[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as Record<string, number> | undefined;
  const total = payload.reduce((acc, p) => acc + (Number(p.value) || 0), 0);

  return (
    <div
      className="rounded-[10px] px-3.5 py-3 text-[13px]"
      style={{ background: CHART_TOOLTIP_BG, color: CHART_TOOLTIP_TEXT }}
    >
      <p className="font-semibold mb-1.5">{label}</p>
      {payload
        .filter((p) => Number(p.value) !== 0)
        .map((p) => {
          const def = channels.find((c) => c.key === p.dataKey);
          const menge = row?.[`${p.dataKey as string}_qty`];
          return (
            <div
              key={p.dataKey as string}
              className="flex items-center justify-between gap-4 py-0.5"
            >
              <span className="flex items-center gap-1.5 opacity-80">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: p.color }}
                />
                {p.name}
                {menge ? (
                  <span className="opacity-60">
                    ({formatNumber(menge)} {def?.hasQuantity ? "Stk" : "Best."})
                  </span>
                ) : null}
              </span>
              <span>{formatEur(Number(p.value), true)}</span>
            </div>
          );
        })}
      <div className="flex items-center justify-between gap-4 pt-1.5 mt-1 border-t border-white/15 font-semibold">
        <span>Gesamt</span>
        <span>{formatEur(total, true)}</span>
      </div>
    </div>
  );
}

export function ProduktMonatsChart({
  data,
  channels,
}: {
  data: Array<Record<string, number | string>>;
  channels: MonatsChartChannel[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART_GRID} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }}
          axisLine={{ stroke: CHART_GRID }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={12}
        />
        <YAxis
          tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }}
          axisLine={false}
          tickLine={false}
          width={68}
          tickFormatter={(v) => formatEur(v)}
        />
        <Tooltip
          content={(props: TooltipContentProps) => (
            <ProduktTooltip {...props} channels={channels} />
          )}
        />
        {channels.map((c) => (
          <Bar
            key={c.key}
            dataKey={c.key}
            name={c.label}
            stackId="produkt"
            fill={c.color}
            radius={[3, 3, 0, 0]}
            maxBarSize={32}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
