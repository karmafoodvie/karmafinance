"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  type TooltipContentProps,
} from "recharts";
import {
  CHART_SERIES,
  CHART_GRID,
  CHART_AXIS_TEXT,
  CHART_TOOLTIP_BG,
  CHART_TOOLTIP_TEXT,
} from "@/lib/chartColors";
import { formatEur } from "@/lib/calculations";
import { Button } from "@/components/ui/Button";

export interface CombinedRevenuePoint {
  label: string;
  Shops: number;
  Shopify: number;
  Lieferdienste: number;
  TGTG: number;
  Projekte: number;
  // Gesamtumsatz desselben Monats im Vorjahr — null, wenn dafür noch keine
  // Daten in der DB liegen (z.B. ganz am Anfang der Historie).
  VorjahrGesamt: number | null;
}

const STREAM_KEYS: Array<keyof Omit<CombinedRevenuePoint, "label" | "VorjahrGesamt">> = [
  "Shops",
  "Shopify",
  "Lieferdienste",
  "TGTG",
  "Projekte",
];

const STREAM_COLORS: Record<string, string> = {
  Shops: CHART_SERIES[0],
  Shopify: CHART_SERIES[1],
  Lieferdienste: CHART_SERIES[2],
  TGTG: CHART_SERIES[3],
  Projekte: CHART_SERIES[4],
};

function CombinedTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const streamEntries = payload.filter((p) => p.dataKey !== "VorjahrGesamt");
  const prevYearEntry = payload.find((p) => p.dataKey === "VorjahrGesamt");
  const total = streamEntries.reduce((acc, p) => acc + (Number(p.value) || 0), 0);

  return (
    <div
      className="rounded-[10px] px-3.5 py-3 text-[13px]"
      style={{ background: CHART_TOOLTIP_BG, color: CHART_TOOLTIP_TEXT }}
    >
      <p className="font-semibold mb-1.5">{label}</p>
      {streamEntries.map((p) => (
        <div key={p.dataKey as string} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 opacity-80">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: p.color }}
            />
            {p.name}
          </span>
          <span>{formatEur(Number(p.value), true)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 pt-1.5 mt-1 border-t border-white/15 font-semibold">
        <span>Gesamt</span>
        <span>{formatEur(total, true)}</span>
      </div>
      {prevYearEntry && prevYearEntry.value != null && (
        <div className="flex items-center justify-between gap-4 pt-1 opacity-60">
          <span>Vorjahr</span>
          <span>{formatEur(Number(prevYearEntry.value), true)}</span>
        </div>
      )}
    </div>
  );
}

export function CombinedRevenueChart({ data }: { data: CombinedRevenuePoint[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showPrevYear, setShowPrevYear] = useState(false);

  const visibleKeys = useMemo(
    () => STREAM_KEYS.filter((k) => !hidden.has(k)),
    [hidden],
  );

  function toggle(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {STREAM_KEYS.map((key) => {
            const isHidden = hidden.has(key);
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  isHidden ? "bg-ink/5 text-ink/35" : "bg-ink/5 text-ink/70 hover:bg-ink/10"
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: isHidden ? "rgba(27,27,20,0.25)" : STREAM_COLORS[key] }}
                />
                {key}
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          variant={showPrevYear ? "secondary" : "ghost"}
          onClick={() => setShowPrevYear((v) => !v)}
          className="text-xs px-4 py-2"
        >
          Vorjahr vergleichen
        </Button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          <Tooltip content={CombinedTooltip} />
          {visibleKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              name={key}
              stackId="revenue"
              fill={STREAM_COLORS[key]}
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
            />
          ))}
          {showPrevYear && (
            <Line
              type="monotone"
              dataKey="VorjahrGesamt"
              name="Vorjahr"
              stroke="#1b1b14"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
