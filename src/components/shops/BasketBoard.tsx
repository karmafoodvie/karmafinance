"use client";

import { useState } from "react";
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
import { LOCATIONS } from "@/lib/constants";
import type { StoreBasketStat, TrendPoint, DiscountByStore } from "@/lib/basket";

type Metric = "basket" | "orders" | "items";

const METRIC_LABEL: Record<Metric, string> = {
  basket: "Ø Warenkorb",
  orders: "Bestellungen",
  items: "Artikel / Bestellung",
};

// Farbe hängt am Standort, nicht an der Position in der gefilterten Liste —
// sonst wechselt beim Weg-/Zuklicken eines Shops die Farbe der anderen.
const COLOR_BY_STORE = new Map(
  LOCATIONS.map((l, i) => [l.shortName, CHART_SERIES[i % CHART_SERIES.length]]),
);

export function BasketBoard({
  stores,
  basketTrend,
  ordersTrend,
  itemsTrend,
  weekdays,
  discounts,
  rangeLabel,
}: {
  stores: StoreBasketStat[];
  basketTrend: TrendPoint[];
  ordersTrend: TrendPoint[];
  itemsTrend: TrendPoint[];
  weekdays: { label: string; orders: number; avgBasket: number }[];
  discounts: DiscountByStore[];
  rangeLabel: string;
}) {
  const [metric, setMetric] = useState<Metric>("basket");

  const data =
    metric === "basket" ? basketTrend : metric === "orders" ? ordersTrend : itemsTrend;
  const fmt =
    metric === "basket"
      ? (v: number) => formatEur(v)
      : metric === "items"
        ? (v: number) => v.toFixed(2)
        : (v: number) => formatNumber(v);

  return (
    <>
      {/* Standort-Vergleich: die Kernfrage "wo läuft was anders" */}
      <Card className="mb-4">
        <CardHeader
          title="Standorte im Vergleich"
          subtitle={`${rangeLabel} · sortiert nach Ø Warenkorb`}
        />
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-ink/45 border-b border-ink/10">
                <th className="font-medium py-2 pr-3">Shop</th>
                <th className="font-medium py-2 px-3 text-right">Ø Warenkorb</th>
                <th className="font-medium py-2 px-3 text-right">Artikel / Best.</th>
                <th className="font-medium py-2 px-3 text-right">Bestellungen</th>
                <th className="font-medium py-2 px-3 text-right">Best. / Tag</th>
                <th className="font-medium py-2 px-3 text-right">Combo-Quote</th>
                <th className="font-medium py-2 pl-3 text-right">To-Go-Indikator</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.code} className="border-b border-ink/5 last:border-0">
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: COLOR_BY_STORE.get(s.shortName) }}
                      />
                      {s.shortName}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium">
                    {formatEur(s.avgBasket)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {s.itemsPerOrder.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink/60">
                    {formatNumber(s.orders)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink/60">
                    {formatNumber(s.ordersPerDay)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {s.comboRate != null ? `${s.comboRate.toFixed(1)} %` : "—"}
                  </td>
                  <td className="py-2 pl-3 text-right tabular-nums text-ink/60">
                    {s.takeawayRate != null ? `${s.takeawayRate.toFixed(1)} %` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink/35 mt-3">
          Upselling (Artikel / Best.) = wie viele Kassenpositionen im Schnitt auf
          einer Rechnung stehen, inkl. Lunch Combos (die als eigene Position
          gebucht werden). 1,00 hieße: fast nie etwas dazu. Alles über 1 ist
          Zusatzverkauf — je höher, desto besser läuft das Upselling.
          {" · "}
          Best. / Tag = Ø Bestellungen an einem Öffnungstag (≈ Besucheranzahl).
          {" · "}
          To-Go-Indikator = Anteil der Bestellungen mit Papiersackerl oder Karma
          Dabba — nicht jede Mitnahme braucht ein Sackerl, aber der einzige harte
          Datenpunkt dafür aus der Kassa.
        </p>
      </Card>

      {/* Verlauf */}
      <Card className="mb-4">
        <CardHeader
          title="Entwicklung je Shop"
          subtitle="Monatsverlauf im gewählten Zeitraum"
          action={
            <div className="flex items-center gap-2">
              {(["basket", "orders", "items"] as Metric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    metric === m ? "bg-ink text-neon" : "bg-ink/5 text-ink/60 hover:bg-ink/10"
                  }`}
                >
                  {METRIC_LABEL[m]}
                </button>
              ))}
            </div>
          }
        />
        <ResponsiveContainer width="100%" height={300}>
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
              width={64}
              tickFormatter={fmt}
            />
            <Tooltip
              contentStyle={{
                background: CHART_TOOLTIP_BG,
                border: "none",
                borderRadius: 12,
                color: CHART_TOOLTIP_TEXT,
                fontSize: 12,
              }}
              labelStyle={{ color: CHART_TOOLTIP_TEXT, opacity: 0.6 }}
              formatter={(v) => fmt(v as number)}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="plainline"
            />
            {stores.map((s) => (
              <Line
                key={s.shortName}
                type="monotone"
                dataKey={s.shortName}
                stroke={COLOR_BY_STORE.get(s.shortName)}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Wochentage */}
        <Card>
          <CardHeader
            title="Bestellungen nach Wochentag"
            subtitle="Summe im gewählten Zeitraum, aktuelle Shop-Auswahl"
          />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekdays} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
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
                tickFormatter={(v: number) => formatNumber(v)}
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
                formatter={(v, name) => [
                  name === "orders" ? formatNumber(v as number) : formatEur(v as number),
                  name === "orders" ? "Bestellungen" : "Ø Warenkorb",
                ]}
              />
              <Bar dataKey="orders" fill={CHART_SERIES[0]} radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="orders"
                  position="top"
                  formatter={(v) => formatNumber(v as number)}
                  style={{ fontSize: 11, fill: CHART_AXIS_TEXT }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Rabatte je Standort */}
        <Card>
          <CardHeader
            title="Rabatte je Shop"
            subtitle="eingelöste Rabatt- und Gutscheinzeilen aus der Kassa"
          />
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="text-left text-ink/45 border-b border-ink/10">
                  <th className="font-medium py-2 pr-3">Shop</th>
                  <th className="font-medium py-2 px-3 text-right">Summe</th>
                  <th className="font-medium py-2 px-3 text-right">% v. Umsatz</th>
                  <th className="font-medium py-2 pl-3">Meistgenutzt</th>
                </tr>
              </thead>
              <tbody>
                {discounts.map((d) => (
                  <tr key={d.shortName} className="border-b border-ink/5 last:border-0 align-top">
                    <td className="py-2 pr-3">{d.shortName}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-orange">
                      {formatEur(d.total)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-ink/60">
                      {d.share.toFixed(1)} %
                    </td>
                    <td className="py-2 pl-3 text-xs text-ink/55">
                      {d.top.length > 0
                        ? d.top.map((t) => `${t.name} (${formatEur(t.amount)})`).join(", ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
