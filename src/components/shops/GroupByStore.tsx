"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import type { StoreTrendPoint } from "@/lib/products";

type Metric = "revenue" | "quantity";

interface StoreTotal {
  label: string;
  revenue: number;
  quantity: number;
}

export function GroupByStore({
  group,
  groups,
  activeType,
  storeKeys,
  revenueTrend,
  quantityTrend,
  storeTotals,
  hasData,
  rangeLabel,
}: {
  group: string;
  groups: string[];
  activeType: string;
  storeKeys: string[];
  revenueTrend: StoreTrendPoint[];
  quantityTrend: StoreTrendPoint[];
  storeTotals: StoreTotal[];
  hasData: boolean;
  rangeLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [metric, setMetric] = useState<Metric>("revenue");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // Gruppenwechsel setzt die Classic/Special-Auswahl zurück.
    if (key === "storegrp") params.delete("storetyp");
    router.push(`${pathname}?${params.toString()}`);
  }

  const data = metric === "revenue" ? revenueTrend : quantityTrend;
  const colorOf = (i: number) => CHART_SERIES[i % CHART_SERIES.length];

  const maxTotal = Math.max(
    ...storeTotals.map((s) => (metric === "revenue" ? s.revenue : s.quantity)),
    1,
  );
  const sortedTotals = [...storeTotals].sort((a, b) =>
    metric === "revenue" ? b.revenue - a.revenue : b.quantity - a.quantity,
  );

  const fmt = (v: number) => (metric === "revenue" ? formatEur(v) : formatNumber(v));

  return (
    <Card className="mb-4">
      <CardHeader
        title="Pro Standort"
        subtitle={`Wie sich eine Überkategorie je Store entwickelt — ${rangeLabel}`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMetric("revenue")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                metric === "revenue" ? "bg-ink text-neon" : "bg-ink/5 text-ink/60 hover:bg-ink/10"
              }`}
            >
              Umsatz
            </button>
            <button
              onClick={() => setMetric("quantity")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                metric === "quantity" ? "bg-ink text-neon" : "bg-ink/5 text-ink/60 hover:bg-ink/10"
              }`}
            >
              Stück
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select
          aria-label="Überkategorie"
          value={group}
          onChange={(e) => setParam("storegrp", e.target.value)}
          className="w-auto"
        >
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
        {group === "Hauptgerichte" && (
          <div className="flex gap-2">
            {["", "Classic", "Special"].map((t) => (
              <button
                key={t || "alle"}
                onClick={() => setParam("storetyp", t)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  activeType === t ? "bg-neon text-ink" : "bg-ink/5 text-ink/50 hover:bg-ink/10"
                }`}
              >
                {t === "" ? "Classic + Special" : t}
              </button>
            ))}
          </div>
        )}
      </div>

      {!hasData ? (
        <p className="text-sm text-ink/40 py-12 text-center">
          Für „{group}“ liegen im gewählten Zeitraum keine Daten vor.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
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
                <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: CHART_AXIS_TEXT }} />
                {storeKeys.map((store, i) => (
                  <Line
                    key={store}
                    type="monotone"
                    dataKey={store}
                    name={store}
                    stroke={colorOf(i)}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Rangliste je Store über den ganzen Zeitraum */}
          <div>
            <p className="text-xs font-medium text-ink/40 mb-3">Summe je Store</p>
            <div className="space-y-3">
              {sortedTotals.map((s) => {
                const val = metric === "revenue" ? s.revenue : s.quantity;
                const storeIdx = storeKeys.indexOf(s.label);
                return (
                  <div key={s.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-ink/70">{s.label}</span>
                      <span className="tabular-nums font-medium">
                        {metric === "revenue" ? formatEur(val) : formatNumber(Math.round(val))}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-ink/5 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max((val / maxTotal) * 100, 2)}%`,
                          background: colorOf(storeIdx),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
