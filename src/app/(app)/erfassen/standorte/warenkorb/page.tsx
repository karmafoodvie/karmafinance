import { buildBasketData } from "@/lib/basket";
import { resolveShopsParams, type ShopsSearchParams } from "@/lib/shopsParams";
import { formatEur, formatNumber } from "@/lib/calculations";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { BasketBoard } from "@/components/shops/BasketBoard";

export default async function WarenkorbPage({
  searchParams,
}: {
  searchParams: Promise<ShopsSearchParams>;
}) {
  const params = await searchParams;
  const p = resolveShopsParams(params);

  const data = await buildBasketData(
    { from: p.fromPeriod, to: p.toPeriod },
    p.fromDate,
    p.toDate,
    p.locationFilter,
  );

  if (!data.hasData) {
    return (
      <Card>
        <p className="text-sm text-ink/50 py-6 text-center">
          Für {p.rangeLabel} liegen keine Bestelldaten vor. Erfasst sind aktuell
          07.01.2025 bis 08.09.2026 — für neuere Zeiträume den
          Kassensystemanalyse-Export aus Odoo schicken.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Ø Warenkorb"
          value={formatEur(data.totals.avgBasket)}
          sub={`${formatNumber(data.totals.orders)} Bestellungen gesamt`}
          info="Umsatz geteilt durch Anzahl der Bestellungen. Zeigt, wie viel im Schnitt pro Rechnung über die Budel geht — unabhängig davon, wie viele Leute kommen."
        />
        <StatTile
          label="Besucher / Tag"
          value={formatNumber(data.totals.ordersPerDay)}
          sub={`Ø über alle Shops · ${formatNumber(data.totals.openDays)} Standorttage`}
          info="Durchschnittliche Bestellanzahl pro Öffnungstag (= Auftrag-Zeile in Odoo). Jede Bestellung entspricht einem Gast-Besuch. Die Aufschlüsselung je Shop steht in der Tabelle unten."
        />
        <StatTile
          label="Upselling"
          value={data.totals.itemsPerOrder.toFixed(2)}
          sub="Artikel pro Bestellung"
          info="Wie viele Kassenpositionen im Schnitt auf einer Rechnung stehen — inkl. Lunch Combos, die als eigene POS-Position zählen. 1,00 hieße: nie etwas dazugekauft. Alles darüber (Drink, Sweet, Combo, Beilage) ist Zusatzverkauf."
        />
        <StatTile
          label="Lunch-Combo-Quote"
          value={`${data.totals.comboRate.toFixed(1)} %`}
          sub="der Bestellungen mit Combo"
          info="Verkaufte Lunch Combos im Verhältnis zur Gesamtzahl der Bestellungen. Combos zählen auch als Upselling (Drink inklusive) und sind im Artikel-Schnitt links enthalten."
        />
      </div>

      <BasketBoard
        stores={data.stores}
        basketTrend={data.basketTrend}
        ordersTrend={data.ordersTrend}
        itemsTrend={data.itemsTrend}
        weekdays={data.weekdays}
        discounts={data.discounts}
        rangeLabel={p.rangeLabel}
      />

      <p className="text-xs text-ink/35">
        Datenbasis: Bestellanzahl und Artikelanzahl je Tag und Standort aus dem
        Kassensystemanalyse-Export (Odoo-Feld &bdquo;Auftrag&ldquo; bzw. &bdquo;Anzahl
        der Verkaufspositionen&ldquo;), erfasst ab 07.01.2025.
        {" · "}
        Lunch Combos zählen als eigene Kassenposition und sind im Upselling-Wert
        bereits enthalten. Eine Sweet Lunch Combo ist in Planung und wird sobald
        verfügbar automatisch mitgezählt.
        {" · "}
        Was die Kassa nicht hergibt: welche Artikel gemeinsam auf einer Rechnung
        standen (also kein &bdquo;Curry + welcher Drink&ldquo;) und wie oft
        dieselbe Person wiederkommt — dafür gibt es keine Kundennummer in den Exporten.
      </p>
    </div>
  );
}
