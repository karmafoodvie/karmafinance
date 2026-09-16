import Link from "next/link";
import { subMonths } from "date-fns";
import { periodStart } from "@/lib/constants";
import { formatEur, formatNumber } from "@/lib/calculations";
import {
  buildProdukteView,
  PRODUCT_CHANNELS,
  type ProductSummary,
  type ProductChannel,
} from "@/lib/produkte";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { ProduktFilter } from "@/components/produkte/ProduktFilter";
import { ProduktMonatsChart } from "@/components/produkte/ProduktMonatsChart";

interface SearchParams {
  fromYear?: string;
  fromMonth?: string;
  toYear?: string;
  toMonth?: string;
  q?: string;
  gruppe?: string;
  produkt?: string;
}

/** Baut einen Link, der die aktuellen Filter beibehält und nur `produkt` setzt. */
function hrefWith(params: SearchParams, produkt: string | null): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (k !== "produkt" && v) sp.set(k, String(v));
  }
  if (produkt) sp.set("produkt", produkt);
  const qs = sp.toString();
  return qs ? `/produkte?${qs}` : "/produkte";
}

function MengenZelle({
  produkt,
  channelKey,
}: {
  produkt: ProductSummary;
  channelKey: ProductChannel;
}) {
  const cell = produkt.byChannel[channelKey];
  if (!cell || (cell.quantity == null && cell.orders == null)) {
    return <span className="text-ink/20">—</span>;
  }
  const menge = cell.quantity ?? cell.orders ?? 0;
  return (
    <span className="tabular-nums">
      {formatNumber(Math.round(menge))}
      <span className="block text-[10px] text-ink/35 leading-tight">
        {formatEur(cell.revenue)}
      </span>
    </span>
  );
}

export default async function ProduktePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const now = new Date();
  const defaultFrom = subMonths(now, 11);

  const fromYear = Number(params.fromYear) || defaultFrom.getFullYear();
  const fromMonth = Number(params.fromMonth) || defaultFrom.getMonth() + 1;
  const toYear = Number(params.toYear) || now.getFullYear();
  const toMonth = Number(params.toMonth) || now.getMonth() + 1;

  let fromPeriod = periodStart(fromYear, fromMonth);
  let toPeriod = periodStart(toYear, toMonth);
  if (fromPeriod > toPeriod) {
    [fromPeriod, toPeriod] = [toPeriod, fromPeriod];
  }

  const view = await buildProdukteView({
    from: fromPeriod,
    to: toPeriod,
    query: params.q,
    group: params.gruppe,
    selected: params.produkt,
  });

  const { months, products, kpis, selected } = view;
  const rangeLabel =
    months.length <= 1
      ? (months[0]?.label ?? "")
      : `${months[0]?.label} – ${months[months.length - 1]?.label}`;

  const shown = products.slice(0, 150);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="font-heading text-xl">Produkte</h1>
          <p className="text-sm text-ink/50 mt-1">
            Verkäufe über alle Kanäle — {rangeLabel}
          </p>
        </div>
        <DateRangePicker
          fromYear={fromYear}
          fromMonth={fromMonth}
          toYear={toYear}
          toMonth={toMonth}
        />
      </div>

      <div className="mb-6">
        <ProduktFilter
          query={params.q ?? ""}
          group={params.gruppe ?? ""}
          groups={view.groups}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Umsatz"
          value={formatEur(kpis.gesamtUmsatz)}
          sub={`${rangeLabel}`}
          info={`Nettoumsatz aller angezeigten Produkte über ${rangeLabel}, summiert über Stores, Webshop, Schrankerl, B2B-Kassa und Catering.`}
        />
        <StatTile
          label="Stück verkauft"
          value={formatNumber(Math.round(kpis.gesamtStueck))}
          sub="ohne Webshop"
          info="Summe der Stückzahlen aus Kassensystem und Schrankerl. Der Webshop ist hier NICHT enthalten, weil Shopify je Produkt nur die Anzahl Bestellungen liefert, keine Stückzahl."
        />
        <StatTile
          label="Webshop"
          value={formatNumber(kpis.webshopBestellungen)}
          sub="Bestellungen"
          info="Anzahl Bestellungen im Webshop, die dieses Produkt enthalten. Shopify gibt auf Produktebene keine Stückzahl aus — zwei Gläser in einer Bestellung zählen hier als 1."
        />
        <StatTile
          label="Produkte"
          value={formatNumber(kpis.produkteMitUmsatz)}
          sub="mit Umsatz im Zeitraum"
          info="Anzahl unterschiedlicher Produkte, die im gewählten Zeitraum und Filter Umsatz gemacht haben."
        />
      </div>

      {selected && (
        <Card className="mb-4 border-ink/25">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
            <div>
              <h2 className="font-heading text-lg">{selected.product.product}</h2>
              <p className="text-sm text-ink/50 mt-0.5">
                {selected.product.group ?? "ohne Gruppe"} ·{" "}
                {formatEur(selected.product.totalRevenue)} über {rangeLabel}
              </p>
            </div>
            <Link
              href={hrefWith(params, null)}
              className="rounded-full border border-ink/15 px-3 py-1 text-xs text-ink/60 hover:border-ink/30 hover:text-ink transition-colors"
            >
              Auswahl aufheben
            </Link>
          </div>

          <div className="flex flex-wrap gap-4 mb-4 mt-3">
            {PRODUCT_CHANNELS.map((c) => {
              const cell = selected.product.byChannel[c.key];
              if (!cell) return null;
              const menge = cell.quantity ?? cell.orders ?? 0;
              return (
                <div key={c.key} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: c.color }}
                  />
                  <div>
                    <p className="text-xs text-ink/45">{c.label}</p>
                    <p className="text-sm font-medium tabular-nums">
                      {formatNumber(Math.round(menge))}{" "}
                      <span className="text-ink/40 font-normal">
                        {c.hasQuantity ? "Stk" : "Best."}
                      </span>
                      <span className="text-ink/40 font-normal">
                        {" · "}
                        {formatEur(cell.revenue)}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <ProduktMonatsChart
            data={selected.monthly}
            channels={PRODUCT_CHANNELS.filter(
              (c) => selected.product.byChannel[c.key] != null,
            ).map((c) => ({
              key: c.key,
              label: c.label,
              color: c.color,
              hasQuantity: c.hasQuantity,
            }))}
          />
        </Card>
      )}

      <Card>
        <CardHeader
          title="Produkte nach Umsatz"
          subtitle={`${products.length} Produkte${products.length > shown.length ? ` — die Top ${shown.length} werden gezeigt` : ""} · Zeile anklicken für den Monatsverlauf`}
        />
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-ink/10">
                <th className="text-left font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pr-4">
                  Produkt
                </th>
                {PRODUCT_CHANNELS.map((c) => (
                  <th
                    key={c.key}
                    className="text-right font-medium text-ink/50 text-xs uppercase tracking-wide py-2 px-2 whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      <InfoTooltip text={c.hint} />
                    </span>
                    <span className="block text-[10px] normal-case font-normal text-ink/30 leading-tight">
                      {c.hasQuantity ? "Stück" : "Bestell."}
                    </span>
                  </th>
                ))}
                <th className="text-right font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pl-3">
                  Umsatz
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const isActive = params.produkt === p.product;
                return (
                  <tr
                    key={p.product}
                    className={`border-b border-ink/5 last:border-0 ${isActive ? "bg-neon/20" : "hover:bg-ink/[0.03]"}`}
                  >
                    <td className="py-2 pr-4">
                      <Link
                        href={hrefWith(params, isActive ? null : p.product)}
                        className="block hover:text-orange transition-colors"
                      >
                        {p.product}
                        <span className="block text-[11px] text-ink/35 leading-tight">
                          {p.group ?? "ohne Gruppe"}
                        </span>
                      </Link>
                    </td>
                    {PRODUCT_CHANNELS.map((c) => (
                      <td key={c.key} className="py-2 px-2 text-right align-top">
                        <MengenZelle produkt={p} channelKey={c.key} />
                      </td>
                    ))}
                    <td className="py-2 pl-3 text-right tabular-nums font-semibold align-top">
                      {formatEur(p.totalRevenue)}
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td
                    colSpan={PRODUCT_CHANNELS.length + 2}
                    className="py-10 text-center text-sm text-ink/40"
                  >
                    Keine Produkte für diesen Filter und Zeitraum.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-ink/35 mt-6">
        Stores und Catering kommen aus dem Odoo-Kassensystem, der Webshop aus
        Shopify, Schrankerl aus den importierten Wochenbestellungen.
        {" · "}
        Stückzahlen und Bestellungen werden nie addiert: beim Webshop zählt
        Shopify auf Produktebene nur, in wie vielen Bestellungen ein Produkt
        vorkam. Der Umsatz ist über alle Kanäle netto und damit vergleichbar.
        {" · "}
        Unterschiedliche Schreibweisen desselben Produkts werden
        zusammengeführt (z.B. Shopify &bdquo;Mango Chili Hot Sauce&ldquo; und
        Kassa &bdquo;Mango Chilli Hot Sauce&ldquo;).
      </p>
    </div>
  );
}
