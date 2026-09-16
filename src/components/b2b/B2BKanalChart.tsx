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
  CHART_GRID,
  CHART_AXIS_TEXT,
  CHART_TOOLTIP_BG,
  CHART_TOOLTIP_TEXT,
} from "@/lib/chartColors";
import { formatEur } from "@/lib/calculations";
import { Button } from "@/components/ui/Button";

export interface B2BChartChannel {
  key: string;
  label: string;
  color: string;
}

export interface B2BChartPointProp {
  label: string;
  [key: string]: number | string | null;
}

function ChartTooltip({
  active,
  payload,
  label,
}: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const channelEntries = payload.filter((p) => p.dataKey !== "VorjahrB2B");
  const prevEntry = payload.find((p) => p.dataKey === "VorjahrB2B");
  const total = channelEntries.reduce((acc, p) => acc + (Number(p.value) || 0), 0);

  return (
    <div
      className="rounded-[10px] px-3.5 py-3 text-[13px]"
      style={{ background: CHART_TOOLTIP_BG, color: CHART_TOOLTIP_TEXT }}
    >
      <p className="font-semibold mb-1.5">{label}</p>
      {channelEntries
        .filter((p) => Number(p.value) !== 0)
        .map((p) => (
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
            </span>
            <span>{formatEur(Number(p.value), true)}</span>
          </div>
        ))}
      <div className="flex items-center justify-between gap-4 pt-1.5 mt-1 border-t border-white/15 font-semibold">
        <span>Gesamt</span>
        <span>{formatEur(total, true)}</span>
      </div>
      {prevEntry && prevEntry.value != null && (
        <div className="flex items-center justify-between gap-4 pt-1 opacity-60">
          <span>Vorjahr B2B</span>
          <span>{formatEur(Number(prevEntry.value), true)}</span>
        </div>
      )}
    </div>
  );
}

export function B2BKanalChart({
  data,
  channels,
  hasPrevYear,
}: {
  data: B2BChartPointProp[];
  channels: B2BChartChannel[];
  hasPrevYear: boolean;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showPrevYear, setShowPrevYear] = useState(false);

  const visible = useMemo(
    () => channels.filter((c) => !hidden.has(c.key)),
    [channels, hidden],
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
          {channels.map((c) => {
            const isHidden = hidden.has(c.key);
            return (
              <button
                key={c.key}
                onClick={() => toggle(c.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  isHidden
                    ? "bg-ink/5 text-ink/35"
                    : "bg-ink/5 text-ink/70 hover:bg-ink/10"
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: isHidden ? "rgba(27,27,20,0.25)" : c.color }}
                />
                {c.label}
              </button>
            );
          })}
        </div>
        {hasPrevYear && (
          <Button
            type="button"
            variant={showPrevYear ? "secondary" : "ghost"}
            onClick={() => setShowPrevYear((v) => !v)}
            className="text-xs px-4 py-2"
          >
            Vorjahr vergleichen
          </Button>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          <Tooltip content={ChartTooltip} />
          {visible.map((c) => (
            <Bar
              key={c.key}
              dataKey={c.key}
              name={c.label}
              stackId="b2b"
              fill={c.color}
              radius={[3, 3, 0, 0]}
              maxBarSize={32}
              isAnimationActive={false}
            />
          ))}
          {showPrevYear && hasPrevYear && (
            <Line
              type="monotone"
              dataKey="VorjahrB2B"
              name="Vorjahr B2B"
              stroke="#1b1b14"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
