"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
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
import type { StoreTopList, ProductByStore } from "@/lib/basket";

type Metric = "revenue" | "quantity";

/**
 * Zwei Fragen auf einen Blick: "wo läuft was am besten" (Top-Liste je Shop)
 * und "wo läuft dieses eine Produkt besser als anderswo" (z.B. Lassi, Pona).
 */
export function ProductStoreCompare({
  topByStore,
  selectableProducts,
  activeProduct,
  productByStore,
  rangeLabel,
}: {
  topByStore: StoreTopList[];
  selectableProducts: string[];
  activeProduct: string;
  productByStore: ProductByStore[];
  rangeLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [metric, setMetric] = useState<Metric>("revenue");

  function setProduct(name: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (name) params.set("prod", name);
    else params.delete("prod");
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  const fmt = metric === "revenue" ? (v: number) => formatEur(v) : (v: number) => formatNumber(v);
  const chartData = productByStore.map((p) => ({
    label: p.shortName,
    value: metric === "revenue" ? p.revenue : p.quantity,
  }));
  const best = [...productByStore].sort((a, b) =>
    metric === "revenue" ? b.revenue - a.revenue : b.quantity - a.quantity,
  )[0];

  return (
    <>
      <Card className="mb-4">
        <CardHeader
          title="Ein Produkt, alle Shops im Vergleich"
          subtitle={`${rangeLabel} · z.B. Mango Lassi oder Pona`}
          action={
            <div className="flex items-center gap-2">
              {(["revenue", "quantity"] as Metric[]).map((m) => (
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
        <div className="mb-4">
          <Select
            aria-label="Produkt"
            value={activeProduct}
            onChange={(e) => setProduct(e.target.value)}
            className="w-auto min-w-72"
          >
            {selectableProducts.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        {chartData.length === 0 ? (
          <p className="text-sm text-ink/40 py-12 text-center">
            Für dieses Produkt liegen im Zeitraum keine Verkäufe vor.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
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
                  width={64}
                  tickFormatter={fmt}
                />
                <Tooltip
                  cursor={{ fill: "rgba(27,27,20,0.04)" }}
                  contentStyle={{
                    background: CHART_TOOLTIP_BG,
                    border: "none",
                    borderRadius: 12,
                    color: CHART_TOOLTIP_TEXT,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: CHART_TOOLTIP_TEXT, opacity: 0.6 }}
                  formatter={(v) => [fmt(v as number), activeProduct]}
                />
                <Bar dataKey="value" fill={CHART_SERIES[1]} radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(v) => fmt(v as number)}
                    style={{ fontSize: 11, fill: CHART_AXIS_TEXT }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {best && (
              <p className="text-xs text-ink/40 mt-2">
                Stärkster Shop für {activeProduct}: {best.shortName} mit{" "}
                {metric === "revenue" ? formatEur(best.revenue) : `${formatNumber(best.quantity)} Stück`}.
              </p>
            )}
          </>
        )}
      </Card>

      <Card className="mb-4">
        <CardHeader
          title="Top 5 je Shop"
          subtitle={`${rangeLabel} · nach Umsatz, ohne Rabatt-/Gutscheinzeilen`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {topByStore.map((store) => (
            <div key={store.shortName} className="rounded-xl border border-ink/10 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-ink/45 mb-2">
                {store.shortName}
              </p>
              {store.products.length === 0 ? (
                <p className="text-xs text-ink/35">keine Daten</p>
              ) : (
                <ol className="space-y-1.5">
                  {store.products.map((p, i) => (
                    <li key={p.productName} className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-ink/75 truncate">
                        <span className="text-ink/30 mr-1.5 tabular-nums">{i + 1}</span>
                        {p.productName}
                      </span>
                      <span className="tabular-nums text-ink/60 shrink-0">
                        {formatEur(p.revenue)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
