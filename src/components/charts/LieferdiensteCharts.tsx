"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
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
import type { WoltLocationPayout, FoodoraLocationPayout } from "@/lib/supabase/types";

// ─── helpers ─────────────────────────────────────────────────────────────────
const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mär", "04": "Apr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Okt", "11": "Nov", "12": "Dez",
};

function fmtMonth(period: string) {
  // "2026-08-01" → "Aug '26"
  const [y, m] = period.split("-");
  return `${MONTH_LABELS[m]} '${y.slice(2)}`;
}

const LOCATION_LABELS: Record<string, string> = {
  "boerse-1010": "Börse",
  "lb-1010": "Laurenz.",
  "ausstellungsstrasse-1020": "Ausstellungsstr.",
  "neustiftgasse-1070": "Neustiftg.",
};

const LOCATION_COLORS: Record<string, string> = {
  "boerse-1010": CHART_SERIES[0],         // blau
  "lb-1010": CHART_SERIES[1],             // orange
  "ausstellungsstrasse-1020": CHART_SERIES[2], // aqua
  "neustiftgasse-1070": CHART_SERIES[3],  // gelb
};

const tooltipStyle = {
  background: CHART_TOOLTIP_BG,
  border: "none",
  borderRadius: 10,
  color: CHART_TOOLTIP_TEXT,
  fontSize: 13,
};
const tooltipLabelStyle = { color: CHART_TOOLTIP_TEXT, fontWeight: 600 };

// ─── props ───────────────────────────────────────────────────────────────────
interface Props {
  woltPayouts: WoltLocationPayout[];
  foodoraPayouts: FoodoraLocationPayout[];
}

// ─── data processing ─────────────────────────────────────────────────────────
function buildTrend(wolt: WoltLocationPayout[], foodora: FoodoraLocationPayout[]) {
  const months = Array.from(
    new Set([...wolt, ...foodora].map((r) => r.period_start))
  ).sort();

  return months.map((period) => {
    const woltTotal = wolt
      .filter((r) => r.period_start === period)
      .reduce((s, r) => s + (r.payout_amount ?? 0), 0);
    const foodoraTotal = foodora
      .filter((r) => r.period_start === period)
      .reduce((s, r) => s + (r.payout_amount ?? 0), 0);
    return {
      month: fmtMonth(period),
      Wolt: Math.round(woltTotal * 100) / 100,
      Foodora: Math.round(foodoraTotal * 100) / 100,
    };
  });
}

function buildLocaleData(
  payouts: (WoltLocationPayout | FoodoraLocationPayout)[],
  locations: string[]
) {
  const months = Array.from(new Set(payouts.map((r) => r.period_start))).sort();
  return months.map((period) => {
    const row: Record<string, string | number> = { month: fmtMonth(period) };
    locations.forEach((loc) => {
      const found = payouts.find((r) => r.period_start === period && r.location_code === loc);
      row[LOCATION_LABELS[loc] ?? loc] = Math.round((found?.payout_amount ?? 0) * 100) / 100;
    });
    return row;
  });
}

// ─── Stat row ─────────────────────────────────────────────────────────────────
function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-ink/45">{label}</span>
      <span
        className="font-heading text-2xl leading-none"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-ink/45">{sub}</span>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LieferdiensteCharts({ woltPayouts, foodoraPayouts }: Props) {
  // aggregate totals
  const woltTotal = woltPayouts.reduce((s, r) => s + (r.payout_amount ?? 0), 0);
  const foodoraTotal = foodoraPayouts.reduce((s, r) => s + (r.payout_amount ?? 0), 0);
  const gesamt = woltTotal + foodoraTotal;

  // best months
  const trend = buildTrend(woltPayouts, foodoraPayouts);
  const bestWolt = trend.reduce((a, b) => (b.Wolt > a.Wolt ? b : a), trend[0]);
  const bestFoodora = trend.reduce((a, b) => (b.Foodora > a.Foodora ? b : a), trend[0]);

  // per-location data
  const woltLocations = Array.from(new Set(woltPayouts.map((r) => r.location_code))).sort();
  const foodoraLocations = Array.from(new Set(foodoraPayouts.map((r) => r.location_code))).sort();
  const woltLocale = buildLocaleData(woltPayouts, woltLocations);
  const foodoraLocale = buildLocaleData(foodoraPayouts, foodoraLocations);

  // detail table
  const allMonths = Array.from(
    new Set([...woltPayouts, ...foodoraPayouts].map((r) => r.period_start))
  ).sort().reverse();

  return (
    <div className="flex flex-col gap-6">

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="Wolt gesamt"
          value={formatEur(woltTotal, true)}
          sub={`Aug '25 – Aug '26`}
          color={CHART_SERIES[0]}
        />
        <Stat
          label="Foodora gesamt"
          value={formatEur(foodoraTotal, true)}
          sub={`Aug '25 – Aug '26`}
          color={CHART_SERIES[1]}
        />
        <Stat
          label="Kombiniert"
          value={formatEur(gesamt, true)}
          sub="Lieferdienste total"
        />
        <Stat
          label="Bester Monat"
          value={bestFoodora.Foodora > bestWolt.Wolt
            ? formatEur(bestFoodora.Foodora, true)
            : formatEur(bestWolt.Wolt, true)}
          sub={bestFoodora.Foodora > bestWolt.Wolt
            ? `Foodora ${bestFoodora.month}`
            : `Wolt ${bestWolt.month}`}
        />
      </div>

      {/* Trend line chart */}
      <div className="rounded-2xl border border-ink/10 bg-white/70 p-4">
        <p className="text-sm font-medium mb-4">Monatlicher Vergleich</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_GRID} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }}
              axisLine={{ stroke: CHART_GRID }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: CHART_AXIS_TEXT }}
              axisLine={false}
              tickLine={false}
              width={52}
              tickFormatter={(v) => formatEur(v)}
            />
            <Tooltip
              formatter={(value) => formatEur(Number(value), true)}
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: CHART_AXIS_TEXT }}
            />
            <Line
              dataKey="Wolt"
              stroke={CHART_SERIES[0]}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART_SERIES[0] }}
              activeDot={{ r: 5 }}
            />
            <Line
              dataKey="Foodora"
              stroke={CHART_SERIES[1]}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART_SERIES[1] }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Per-location bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Wolt */}
        <div className="rounded-2xl border border-ink/10 bg-white/70 p-4">
          <p className="text-sm font-medium mb-4">
            <span style={{ color: CHART_SERIES[0] }}>● </span>Wolt — Auszahlung pro Standort
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={woltLocale} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} width={46} tickFormatter={(v) => formatEur(v)} />
              <Tooltip
                formatter={(value) => formatEur(Number(value), true)}
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
              />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: CHART_AXIS_TEXT }} />
              {woltLocations.map((loc) => (
                <Bar
                  key={loc}
                  dataKey={LOCATION_LABELS[loc] ?? loc}
                  fill={LOCATION_COLORS[loc] ?? CHART_SERIES[4]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Foodora */}
        <div className="rounded-2xl border border-ink/10 bg-white/70 p-4">
          <p className="text-sm font-medium mb-4">
            <span style={{ color: CHART_SERIES[1] }}>● </span>Foodora — Auszahlung pro Standort
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={foodoraLocale} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke={CHART_GRID} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: CHART_AXIS_TEXT }} axisLine={false} tickLine={false} width={46} tickFormatter={(v) => formatEur(v)} />
              <Tooltip
                formatter={(value) => formatEur(Number(value), true)}
                contentStyle={tooltipStyle}
                labelStyle={tooltipLabelStyle}
              />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: CHART_AXIS_TEXT }} />
              {foodoraLocations.map((loc) => (
                <Bar
                  key={loc}
                  dataKey={LOCATION_LABELS[loc] ?? loc}
                  fill={LOCATION_COLORS[loc] ?? CHART_SERIES[4]}
                  radius={[3, 3, 0, 0]}
                  maxBarSize={28}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail table */}
      <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 overflow-x-auto">
        <p className="text-sm font-medium mb-3">Monat für Monat</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink/45 font-medium uppercase tracking-wide border-b border-ink/10">
              <th className="text-left py-2 pr-4">Monat</th>
              <th className="text-right py-2 pr-4" style={{ color: CHART_SERIES[0] }}>Wolt</th>
              <th className="text-right py-2 pr-4" style={{ color: CHART_SERIES[1] }}>Foodora</th>
              <th className="text-right py-2">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {allMonths.map((period) => {
              const w = woltPayouts
                .filter((r) => r.period_start === period)
                .reduce((s, r) => s + (r.payout_amount ?? 0), 0);
              const f = foodoraPayouts
                .filter((r) => r.period_start === period)
                .reduce((s, r) => s + (r.payout_amount ?? 0), 0);
              return (
                <tr key={period} className="border-b border-ink/5 last:border-0 hover:bg-ink/[0.02]">
                  <td className="py-2 pr-4 font-medium">{fmtMonth(period)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {w > 0 ? formatEur(w, true) : <span className="text-ink/25">—</span>}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {f > 0 ? formatEur(f, true) : <span className="text-ink/25">—</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {formatEur(w + f, true)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink/15 font-semibold">
              <td className="py-2 pr-4">Gesamt</td>
              <td className="py-2 pr-4 text-right tabular-nums" style={{ color: CHART_SERIES[0] }}>
                {formatEur(woltTotal, true)}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums" style={{ color: CHART_SERIES[1] }}>
                {formatEur(foodoraTotal, true)}
              </td>
              <td className="py-2 text-right tabular-nums">
                {formatEur(gesamt, true)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
