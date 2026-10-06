"use client";

import { useState } from "react";
import Link from "next/link";
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
import { formatEur, formatNumber } from "@/lib/calculations";
import { Card, CardHeader } from "@/components/ui/Card";
import type {
  GesamtstromGroupRow,
  GesamtstromPoint,
  GesamtstromStoreRow,
} from "@/lib/products";

type Metric = "revenue" | "quantity";

function pct(v: number): string {
  return `${v.toLocaleString("de-AT", { maximumFractionDigits: 1 })} %`;
}

export function GesamtstromOverview({
  chartGroups,
  revenueTrend,
  quantityTrend,
  groupRows,
  storeRows,
  rangeLabel,
  detailQuery,
}: {
  chartGroups: string[];
  revenueTrend: GesamtstromPoint[];
  quantityTrend: GesamtstromPoint[];
  groupRows: GesamtstromGroupRow[];
  storeRows: GesamtstromStoreRow[];
  rangeLabel: string;
  /** aktuelle Filter (Zeitraum, Shops) als Query, damit der Sprung in die Details sie behält */
  detailQuery: string;
}) {
  const [metric, setMetric] = useState<Metric>("revenue");
  const data = metric === "revenue" ? revenueTrend : quantityTrend;
  const fmt = (v: number) => (metric === "revenue" ? formatEur(v) : formatNumber(v));
  const colorOf = (g: string) => CHART_SERIES[chartGroups.indexOf(g) % CHART_SERIES.length];
  const detailHref = `/erfassen/standorte/produkte${detailQuery ? `?${detailQuery}` : ""}`;
  const maxStore = Math.max(...storeRows.map((s) => Math.abs(s.revenue)), 1);

  return (
    <>
      <Card className="mb-4">
        <CardHeader
          title="Gesamtstrom"
          subtitle={`Alle Gerichte und Produkte der gewählten Shops, nach Überkategorie — ${rangeLabel}`}
          action={
            <div className="flex items-center gap-2">
              {(["revenue", "quantity"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    metric === m ? "bg-ink text-neon" : "bg-ink/5 text-ink/60 hover:bg-ink/10"
                  }`}
                >
                  {m === "revenue" ? "Umsatz" : "Stück"}
                </button>
              ))}
            </div>
          }
        />
        <ResponsiveContainer width="100%" height={300}>
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
              width={56}
              tickFormatter={fmt}
            />
            <Tooltip
              formatter={(value) =>
                metric === "revenue"
                  ? formatEur(Number(value), true)
                  : `${formatNumber(Number(value))} Stück`
              }
              contentStyle={{
                background: CHART_TOOLTIP_BG,
                border: "none",
                borderRadius: 10,
                color: CHART_TOOLTIP_TEXT,
                fontSize: 13,
              }}
              labelStyle={{ color: CHART_TOOLTIP_TEXT, fontWeight: 600 }}
            />
            <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: CHART_AXIS_TEXT }} />
            {chartGroups.map((g) => (
              <Bar key={g} dataKey={g} name={g} stackId="gesamt" fill={colorOf(g)} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-ink/35 mt-2">
          Rabatt- und Gutscheinzeilen (negativ) sind im Diagramm nicht gestapelt, aber in den
          Summen unten bereits abgezogen.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader
            title="Nach Überkategorie"
            subtitle="Woraus sich der Umsatz zusammensetzt"
          />
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink/40 text-right">
                <th className="text-left font-medium pb-2">Überkategorie</th>
                <th className="font-medium pb-2">Umsatz</th>
                <th className="font-medium pb-2">Anteil</th>
                <th className="font-medium pb-2">Stück</th>
                <th className="font-medium pb-2">Ø pro Stück</th>
              </tr>
            </thead>
            <tbody>
              {groupRows.map((g) => (
                <tr key={g.group} className="border-t border-ink/5 text-right tabular-nums">
                  <td className="text-left py-2">
                    {chartGroups.includes(g.group) && (
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-sm mr-2 align-middle"
                        style={{ background: colorOf(g.group) }}
                      />
                    )}
                    {g.group}
                  </td>
                  <td className="py-2">{formatEur(g.revenue)}</td>
                  <td className="py-2 text-ink/60">{pct(g.share)}</td>
                  <td className="py-2">{formatNumber(Math.round(g.quantity))}</td>
                  <td className="py-2 text-ink/60">
                    {g.avgPrice != null ? formatEur(g.avgPrice, true) : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title="Nach Standort" subtitle="Anteil am Gesamtumsatz" />
          <div className="space-y-3">
            {storeRows.map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-ink/70">{s.label}</span>
                  <span className="tabular-nums font-medium">
                    {formatEur(s.revenue)}{" "}
                    <span className="text-ink/40 font-normal">· {pct(s.share)}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-ink/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange"
                    style={{ width: `${Math.max((Math.abs(s.revenue) / maxStore) * 100, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <p className="text-sm text-ink/50 mb-6">
        Details zu einzelnen Produkten, Standort-Vergleich und Trends:{" "}
        <Link href={detailHref} className="text-orange underline underline-offset-2">
          zum Reiter Produkte →
        </Link>
      </p>
    </>
  );
}
