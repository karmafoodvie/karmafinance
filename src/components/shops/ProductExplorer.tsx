"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  CHART_SERIES,
  CHART_GRID,
  CHART_AXIS_TEXT,
  CHART_TOOLTIP_BG,
  CHART_TOOLTIP_TEXT,
} from "@/lib/chartColors";
import { formatEur, formatNumber, formatPercent } from "@/lib/calculations";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import type { ProductSummary, ProductTrendPoint } from "@/lib/products";
import type { LocationDef } from "@/lib/constants";

type Metric = "revenue" | "quantity";

export function ProductExplorer({
  summaries,
  trendProducts,
  revenueTrend,
  quantityTrend,
  locations,
  categories,
  activeLocation,
  activeCategory,
}: {
  summaries: ProductSummary[];
  trendProducts: string[];
  revenueTrend: ProductTrendPoint[];
  quantityTrend: ProductTrendPoint[];
  locations: LocationDef[];
  categories: string[];
  activeLocation: string;
  activeCategory: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [metric, setMetric] = useState<Metric>("revenue");
  const [selected, setSelected] = useState<string[]>(() => trendProducts.slice(0, 3));
  const [search, setSearch] = useState("");

  const data = metric === "revenue" ? revenueTrend : quantityTrend;

  const filteredSummaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter((s) => s.productName.toLowerCase().includes(q));
  }, [summaries, search]);

  // Produkte, die zur Suche passen und eine Monatsreihe haben — nur die
  // lassen sich sinnvoll ins Chart legen.
  const selectableProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trendProducts;
    return trendProducts.filter((p) => p.toLowerCase().includes(q));
  }, [trendProducts, search]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleProduct(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
    );
  }

  const fmt = metric === "revenue"
    ? (v: number) => formatEur(v)
    : (v: number) => formatNumber(v);

  return (
    <div>
      <Card className="mb-4">
        <CardHeader
          title="Produkte im Zeitverlauf"
          subtitle="Produkt anklicken, um es ins Diagramm zu legen"
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

        <div className="flex flex-wrap gap-2 mb-4">
          <Select
            aria-label="Standort"
            value={activeLocation}
            onChange={(e) => setParam("loc", e.target.value)}
            className="w-auto"
          >
            <option value="">Alle Shops</option>
            {locations.map((l) => (
              <option key={l.code} value={l.code}>
                {l.shortName}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Kategorie"
            value={activeCategory}
            onChange={(e) => setParam("cat", e.target.value)}
            className="w-auto"
          >
            <option value="">Alle Kategorien</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "Rabatte/Gutscheine" : c}
              </option>
            ))}
          </Select>
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Produkt suchen, z. B. Lunch Combo"
            className="w-auto min-w-56 flex-1"
          />
        </div>

        {selected.length === 0 ? (
          <p className="text-sm text-ink/40 py-16 text-center">
            Unten ein Produkt anklicken, dann erscheint es hier im Verlauf.
          </p>
        ) : (
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
                formatter={(value, name) => [
                  metric === "revenue"
                    ? formatEur(Number(value), true)
                    : `${formatNumber(Number(value))} Stück`,
                  name,
                ]}
                contentStyle={{
                  background: CHART_TOOLTIP_BG,
                  border: "none",
                  borderRadius: 10,
                  color: CHART_TOOLTIP_TEXT,
                  fontSize: 13,
                }}
                labelStyle={{ color: CHART_TOOLTIP_TEXT, fontWeight: 600 }}
              />
              {selected.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={CHART_SERIES[i % CHART_SERIES.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        {selectableProducts.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-ink/5">
            {selectableProducts.map((name) => {
              const isOn = selected.includes(name);
              const colorIdx = selected.indexOf(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleProduct(name)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    isOn ? "bg-ink/10 text-ink/80" : "bg-ink/5 text-ink/45 hover:bg-ink/10"
                  }`}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{
                      background: isOn
                        ? CHART_SERIES[colorIdx % CHART_SERIES.length]
                        : "rgba(27,27,20,0.2)",
                    }}
                  />
                  {name}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Alle Produkte"
          subtitle={`${filteredSummaries.length} Produkte im gewählten Zeitraum · Trend = zweite vs. erste Hälfte des Zeitraums`}
        />
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-ink/45 border-b border-ink/10">
                <th className="font-medium py-2 pr-3">Produkt</th>
                <th className="font-medium py-2 px-3">Kategorie</th>
                <th className="font-medium py-2 px-3 text-right">Stück</th>
                <th className="font-medium py-2 px-3 text-right">Umsatz</th>
                <th className="font-medium py-2 px-3 text-right">Marge</th>
                <th className="font-medium py-2 pl-3 text-right">Trend</th>
              </tr>
            </thead>
            <tbody>
              {filteredSummaries.map((s) => (
                <tr key={s.productName} className="border-b border-ink/5 last:border-0">
                  <td className="py-2 pr-3">
                    {trendProducts.includes(s.productName) ? (
                      <button
                        onClick={() => toggleProduct(s.productName)}
                        className="text-left hover:text-orange transition-colors cursor-pointer"
                      >
                        {s.productName}
                      </button>
                    ) : (
                      <span className="text-ink/70">{s.productName}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-ink/45">
                    {s.category === "All" ? "Rabatt" : s.category}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {formatNumber(Math.round(s.quantity))}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {formatEur(s.revenue)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink/50">
                    {formatEur(s.margin)}
                  </td>
                  <td
                    className={`py-2 pl-3 text-right tabular-nums ${
                      s.trendPct == null
                        ? "text-ink/25"
                        : s.trendPct >= 0
                          ? "text-ink/70"
                          : "text-orange"
                    }`}
                  >
                    {s.trendPct == null ? "–" : formatPercent(s.trendPct, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
