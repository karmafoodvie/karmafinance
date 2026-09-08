import { subMonths } from "date-fns";
import { buildDashboardData } from "@/lib/dashboard";
import { formatEur } from "@/lib/calculations";
import { QUICK_LINKS, periodStart } from "@/lib/constants";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { QuickLinks } from "@/components/ui/QuickLinks";
import { RevenueTrendChart } from "@/components/charts/RevenueTrendChart";
import { StreamComparisonChart } from "@/components/charts/StreamComparisonChart";
import { LocationBarChart } from "@/components/charts/LocationBarChart";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    fromYear?: string;
    fromMonth?: string;
    toYear?: string;
    toMonth?: string;
  }>;
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
  // Falls von/bis vertauscht eingegeben werden — Datums-Strings im Format
  // YYYY-MM-DD lassen sich direkt lexikographisch vergleichen.
  if (fromPeriod > toPeriod) {
    [fromPeriod, toPeriod] = [toPeriod, fromPeriod];
  }

  const { revenueTrend, streamComparison, locationBar, kpis, months } =
    await buildDashboardData({ from: fromPeriod, to: toPeriod });

  const rangeStartLabel = months[0]?.label ?? "";
  const rangeEndLabel = months[months.length - 1]?.label ?? "";
  const isSingleMonth = months.length <= 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-xl">Dashboard</h1>
          <p className="text-sm text-ink/50 mt-1">
            Kennzahlen oben beziehen sich auf {rangeEndLabel}
          </p>
        </div>
        <DateRangePicker
          fromYear={fromYear}
          fromMonth={fromMonth}
          toYear={toYear}
          toMonth={toMonth}
        />
      </div>

      <Card className="mb-6">
        <CardHeader
          title="Schnellzugriffe"
          subtitle="Direkt zu den Portalen, aus denen die Zahlen kommen"
        />
        <QuickLinks links={QUICK_LINKS} />
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Umsatz gesamt"
          value={formatEur(kpis.currentTotal)}
          sub="Shops + Shopify + Lieferdienste"
          yoy={kpis.totalYoy}
          info={`Summe aus allen drei Einkommensströmen für ${rangeEndLabel} (das Ende des gewählten Zeitraums): Shops (Lunch-Locations), Shopify-Webshop und Lieferdienste (Wolt + Foodora).`}
        />
        <StatTile
          label="Shops"
          value={formatEur(kpis.currentShops)}
          sub="alle Standorte"
          info={`Umsatz aus allen Lunch-Locations vor Ort, ${rangeEndLabel} zusammengerechnet.`}
        />
        <StatTile
          label="Shopify"
          value={formatEur(kpis.currentShopify)}
          yoy={kpis.shopifyYoy}
          info={`Der Auszahlungsbetrag aus dem Webshop karmafood.at für ${rangeEndLabel} (nach Shopify-Gebühren).`}
        />
        <StatTile
          label="Lieferdienste"
          value={formatEur(kpis.currentDelivery)}
          sub="Wolt + Foodora"
          yoy={kpis.deliveryYoy}
          info={`Auszahlungen von Wolt und Foodora zusammen, ${rangeEndLabel}. Die Prozentsätze, die die Lieferdienste selbst einbehalten, sind hier schon abgezogen.`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Umsatzverlauf"
            subtitle={
              isSingleMonth
                ? `${rangeEndLabel}, gesamt (alle Streams)`
                : `${rangeStartLabel} – ${rangeEndLabel}, gesamt (alle Streams)`
            }
          />
          <RevenueTrendChart data={revenueTrend} />
        </Card>
        <Card>
          <CardHeader title="Standorte" subtitle={`Umsatz ${rangeEndLabel}`} />
          {locationBar.length > 0 ? (
            <LocationBarChart data={locationBar} />
          ) : (
            <p className="text-sm text-ink/40 py-10 text-center">
              Noch keine Standort-Daten für diesen Monat.
            </p>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Streams im Vergleich"
          subtitle={`Shops vs. Shopify vs. Lieferdienste, pro Monat (${rangeStartLabel} – ${rangeEndLabel})`}
        />
        <StreamComparisonChart data={streamComparison} />
      </Card>

      <p className="text-xs text-ink/35 mt-6">
        Rabatte gesamt ({rangeEndLabel}): {formatEur(kpis.currentDiscounts)}
        {" · "}
        YoY = Veränderung ggü. demselben Monat im Vorjahr. &bdquo;Kein
        Vorjahr&ldquo; heißt: für diesen Monat letztes Jahr liegt noch kein
        Wert in der Datenbank vor.
        {" · "}
        Mit &bdquo;von–bis&ldquo; oben kannst du jeden beliebigen Zeitraum
        anzeigen — Umsatzverlauf und Streams-Vergleich zeigen dann genau
        diese Monate, die Kennzahlen oben beziehen sich immer auf den letzten
        Monat des gewählten Zeitraums.
      </p>
    </div>
  );
}
