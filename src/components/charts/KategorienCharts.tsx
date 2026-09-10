"use client";

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
import { formatEur, formatNumber } from "@/lib/calculations";
import type { CategoryStat, CategoryMonthly } from "@/lib/supabase/types";

// ─── helpers ────────────────────────────────────────────────────────────────
const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mär", "04": "Apr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Okt", "11": "Nov", "12": "Dez",
};

function fmtMonth(d: string) {
  const [y, m] = d.split("-");
  return `${MONTH_LABELS[m]} '${y.slice(2)}`;
}

// Kategorien für Trendchart (die 4 umsatzstärksten pro Tag — stabil)
const TREND_CATS = ["Curry", "Lasagne", "Dal", "Lunch Combo"];
const TREND_COLORS: Record<string, string> = {
  "Curry":       CHART_SERIES[0],
  "Lasagne":     CHART_SERIES[1],
  "Dal":         CHART_SERIES[2],
  "Lunch Combo": CHART_SERIES[3],
};

const tooltipStyle = {
  background: CHART_TOOLTIP_BG,
  border: "none",
  borderRadius: 10,
  color: CHART_TOOLTIP_TEXT,
  fontSize: 13,
};
const tooltipLabelStyle = { color: CHART_TOOLTIP_TEXT, fontWeight: 600 };

// ─── Props ──────────────────────────────────────────────────────────────────
interface Props {
  stats: CategoryStat[];
  monthly: CategoryMonthly[];
}

// ─── Trend data ──────────────────────────────────────────────────────────────
function buildTrend(monthly: CategoryMonthly[]) {
  const months = Array.from(new Set(monthly.map((r) => r.month_start))).sort();
  return months.map((m) => {
    const row: Record<string, string | number> = { month: fmtMonth(m) };
    TREND_CATS.forEach((cat) => {
      const found = monthly.find((r) => r.month_start === m && r.category === cat);
      row[cat] = found ? found.revenue_per_day : 0;
    });
    return row;
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────
export function KategorienCharts({ stats, monthly }: Props) {
  const trend = buildTrend(monthly);

  return (
    <div className="flex flex-col gap-4">
      {/* Erklärung */}
      <div className="rounded-2xl border border-ink/10 bg-white/70 p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <p className="text-sm font-medium">Kategorien — normalisiert nach Angebotstagen</p>
            <p className="text-xs text-ink/45 mt-0.5">
              Ø Umsatz pro Tag, an dem die Kategorie angeboten wurde — bereinigt um Angebotsfrequenz.
            </p>
          </div>
          <span className="text-xs text-ink/35 whitespace-nowrap">
            Jan 2025 – heute · alle Standorte
          </span>
        </div>

        {/* Tabelle */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink/45 font-medium uppercase tracking-wide border-b border-ink/10">
                <th className="text-left py-2 pr-4">Kategorie</th>
                <th className="text-right py-2 pr-4">Tage</th>
                <th className="text-right py-2 pr-4">Stück ges.</th>
                <th className="text-right py-2 pr-4">Ø Stück/Tag</th>
                <th className="text-right py-2 pr-4">Umsatz ges.</th>
                <th className="text-right py-2">Ø Umsatz/Tag</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr
                  key={s.category}
                  className="border-b border-ink/5 last:border-0 hover:bg-ink/[0.02]"
                >
                  <td className="py-2 pr-4 font-medium">
                    {TREND_COLORS[s.category] && (
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{ background: TREND_COLORS[s.category] }}
                      />
                    )}
                    {s.category}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-ink/60">
                    {s.days_served}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-ink/60">
                    {formatNumber(s.total_qty)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-ink/60">
                    {Number(s.qty_per_day).toFixed(1)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-ink/60">
                    {formatEur(s.total_revenue, true)}
                  </td>
                  <td className="py-2 text-right tabular-nums font-semibold">
                    {formatEur(s.revenue_per_day, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Saisonaler Trend — Top 4 */}
      <div className="rounded-2xl border border-ink/10 bg-white/70 p-4">
        <p className="text-sm font-medium mb-1">Saisonaler Verlauf — Ø Umsatz pro Angebotstag</p>
        <p className="text-xs text-ink/45 mb-4">
          Zeigt Curry, Lasagne, Dal und Lunch Combo — normalisiert, damit unterschiedliche Angebotsfrequenz keinen Einfluss hat.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trend} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_GRID} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: CHART_AXIS_TEXT }}
              axisLine={{ stroke: CHART_GRID }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: CHART_AXIS_TEXT }}
              axisLine={false}
              tickLine={false}
              width={54}
              tickFormatter={(v) => formatEur(v)}
            />
            <Tooltip
              formatter={(value, name) => [formatEur(Number(value), true), name]}
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: CHART_AXIS_TEXT }}
            />
            {TREND_CATS.map((cat) => (
              <Line
                key={cat}
                dataKey={cat}
                stroke={TREND_COLORS[cat]}
                strokeWidth={2}
                dot={{ r: 2.5, fill: TREND_COLORS[cat] }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
