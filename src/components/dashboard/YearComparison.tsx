"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
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
import { formatEur, formatPercent } from "@/lib/calculations";
import { Card, CardHeader } from "@/components/ui/Card";
import type { YearLine, StreamDelta } from "@/lib/dashboard";

// Farbe je Jahr: laufendes Jahr im Marken-Orange (am auffälligsten),
// Vorjahre in Blau/Violett.
const YEAR_COLORS = [CHART_SERIES[0], CHART_SERIES[6], CHART_SERIES[4]];
const CURRENT_COLOR = CHART_SERIES[1]; // Orange

type Mode = "ytd" | "full";

interface Props {
  monthLabels: string[];
  lastComplete: number;
  currentYear: number;
  prevYear: number;
  lines: YearLine[];
  ytd: {
    throughLabel: string | null;
    current: number | null;
    previous: number | null;
    deltaPct: number | null;
  };
  projectedYearEnd: number | null;
  prevYearFullTotal: number | null;
  perStream: StreamDelta[];
}

export function YearComparison(props: Props) {
  const {
    monthLabels,
    lastComplete,
    currentYear,
    prevYear,
    lines,
    ytd,
    projectedYearEnd,
    prevYearFullTotal,
    perStream,
  } = props;
  const [mode, setMode] = useState<Mode>("ytd");

  const currentLine = lines.find((l) => l.year === currentYear);
  const priorLines = lines.filter((l) => l.year !== currentYear);

  const forecastKey = `${currentYear} Prognose`;

  const data = useMemo(() => {
    const count = mode === "ytd" ? Math.max(lastComplete, 1) : 12;
    const rows: Record<string, string | number | null>[] = [];
    for (let i = 0; i < count; i++) {
      const row: Record<string, string | number | null> = { label: monthLabels[i] };
      for (const l of lines) row[String(l.year)] = l.actual[i];
      if (mode === "full" && currentLine) {
        row[forecastKey] = currentLine.forecast[i];
      }
      rows.push(row);
    }
    return rows;
  }, [mode, lastComplete, lines, monthLabels, currentLine, forecastKey]);

  const colorFor = (year: number, idx: number) =>
    year === currentYear ? CURRENT_COLOR : YEAR_COLORS[idx % YEAR_COLORS.length];

  const deltaUp = (ytd.deltaPct ?? 0) >= 0;

  return (
    <Card className="mb-4">
      <CardHeader
        title="Jahresvergleich"
        subtitle={
          ytd.throughLabel
            ? `${currentYear} vs. ${prevYear} — bisher Jän–${ytd.throughLabel}`
            : `${currentYear} vs. ${prevYear}`
        }
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("ytd")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                mode === "ytd" ? "bg-ink text-neon" : "bg-ink/5 text-ink/60 hover:bg-ink/10"
              }`}
            >
              Bisheriges Jahr
            </button>
            <button
              onClick={() => setMode("full")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                mode === "full" ? "bg-ink text-neon" : "bg-ink/5 text-ink/60 hover:bg-ink/10"
              }`}
            >
              Ganzes Jahr + Prognose
            </button>
          </div>
        }
      />

      {/* Große Kernaussage: bisher vs. Vorjahr */}
      {ytd.current != null && ytd.previous != null && (
        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 mb-5">
          <div>
            <p className="text-xs text-ink/45 mb-0.5">
              {currentYear} bisher (Jän–{ytd.throughLabel})
            </p>
            <p className="font-heading text-2xl leading-none">{formatEur(ytd.current)}</p>
          </div>
          <div>
            <p className="text-xs text-ink/45 mb-0.5">{prevYear} gleicher Zeitraum</p>
            <p className="font-heading text-2xl leading-none text-ink/45">
              {formatEur(ytd.previous)}
            </p>
          </div>
          {ytd.deltaPct != null && (
            <div
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                deltaUp ? "bg-neon/40 text-ink" : "bg-orange/15 text-orange"
              }`}
            >
              {deltaUp ? "▲" : "▼"} {formatPercent(ytd.deltaPct, 1)} vs. Vorjahr
            </div>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: CHART_AXIS_TEXT }} />
          {priorLines.map((l, idx) => (
            <Line
              key={l.year}
              type="monotone"
              dataKey={String(l.year)}
              name={String(l.year)}
              stroke={colorFor(l.year, idx)}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
          {currentLine && (
            <Line
              type="monotone"
              dataKey={String(currentYear)}
              name={String(currentYear)}
              stroke={CURRENT_COLOR}
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
          )}
          {mode === "full" && currentLine && (
            <Line
              type="monotone"
              dataKey={forecastKey}
              name={forecastKey}
              stroke={CURRENT_COLOR}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {mode === "full" && projectedYearEnd != null && (
        <p className="text-sm text-ink/50 mt-3">
          Hochrechnung Jahresende {currentYear}:{" "}
          <span className="font-medium text-ink/80">{formatEur(projectedYearEnd)}</span>
          {prevYearFullTotal != null && (
            <>
              {" "}· {prevYear} gesamt: {formatEur(prevYearFullTotal)}
            </>
          )}
          <span className="text-ink/35">
            {" "}— Restmonate anhand des bisherigen Trends geschätzt, keine Garantie.
          </span>
        </p>
      )}

      {/* Pro-Kanal-Veränderung */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-5 pt-5 border-t border-ink/5">
        {perStream.map((s) => {
          const up = (s.deltaPct ?? 0) >= 0;
          return (
            <div key={s.key}>
              <p className="text-xs text-ink/45">{s.label}</p>
              <p className="font-heading text-base leading-tight mt-0.5">
                {s.current != null ? formatEur(s.current) : "–"}
              </p>
              {s.deltaPct != null ? (
                <p className={`text-xs font-medium mt-0.5 ${up ? "text-ink/60" : "text-orange"}`}>
                  {up ? "▲" : "▼"} {formatPercent(s.deltaPct, 0)}
                </p>
              ) : (
                <p className="text-xs text-ink/30 mt-0.5">kein Vorjahr</p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
