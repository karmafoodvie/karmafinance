import { subMonths } from "date-fns";
import { buildDashboardData, buildYearComparison } from "@/lib/dashboard";
import { formatEur } from "@/lib/calculations";
import { QUICK_LINKS, periodStart } from "@/lib/constants";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { QuickLinks } from "@/components/ui/QuickLinks";
import { CombinedRevenueChart } from "@/components/charts/CombinedRevenueChart";
import { LocationBarChart } from "@/components/charts/LocationBarChart";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { YearComparison } from "@/components/dashboard/YearComparison";

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

  const [{ streamComparison, locationBar, kpis, months }, yearComparison] =
    await Promise.all([
      buildDashboardData({ from: fromPeriod, to: toPeriod }),
      buildYearComparison(),
    ]);

  const rangeStartLabel = months[0]?.label ?? "";
  const rangeEndLabel = months[months.length - 1]?.label ?? "";
  const isSingleMonth = months.length <= 1;
  const rangeLabel = isSingleMonth
    ? rangeEndLabel
    : `${rangeStartLabel} – ${rangeEndLabel}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-xl">Dashboard</h1>
          <p className="text-sm text-ink/50 mt-1">
            Kennzahlen oben sind die Summe über {rangeLabel}
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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatTile
          label="Umsatz gesamt"
          value={formatEur(kpis.currentTotal)}
          sub="Shops + Shopify + Lieferdienste + TGTG + Projekte"
          yoy={kpis.totalYoy}
          info={`Summe aus allen Einkommensströmen über ${rangeLabel}: Shops (Lunch-Locations), Shopify-Webshop, Lieferdienste (Wolt + Foodora), Too Good To Go (netto, nach TGTG-Gebühr) und Projekte/Pop-ups.`}
        />
        <StatTile
          label="Shops"
          value={formatEur(kpis.currentShops)}
          sub="alle Standorte"
          info={`Umsatz aus allen Lunch-Locations vor Ort, ${rangeLabel} zusammengerechnet.`}
        />
        <StatTile
          label="Shopify"
          value={formatEur(kpis.currentShopify)}
          yoy={kpis.shopifyYoy}
          info={`Der Auszahlungsbetrag aus dem Webshop karmafood.at über ${rangeLabel} (nach Shopify-Gebühren).`}
        />
        <StatTile
          label="Lieferdienste"
          value={formatEur(kpis.currentDelivery)}
          sub="Wolt + Foodora"
          yoy={kpis.deliveryYoy}
          info={`Auszahlungen von Wolt und Foodora zusammen über ${rangeLabel}. Die Prozentsätze, die die Lieferdienste selbst einbehalten, sind hier schon abgezogen.`}
        />
        <StatTile
          label="Too Good To Go"
          value={formatEur(kpis.currentTgtgNet)}
          sub={
            kpis.currentTgtgGross != null
              ? `Brutto ${formatEur(kpis.currentTgtgGross)}${kpis.currentTgtgMeals != null ? ` · ${kpis.currentTgtgMeals} Sackerl` : ""}`
              : "noch keine Daten"
          }
          yoy={kpis.tgtgYoy}
          info={`Netto-Auszahlung von Too Good To Go über ${rangeLabel}: Verkaufswert der geretteten Überraschungssackerl${kpis.currentTgtgGross != null ? ` (Brutto ${formatEur(kpis.currentTgtgGross)})` : ""} minus TGTG-Reservierungsgebühr${kpis.currentTgtgFee != null ? ` (${formatEur(kpis.currentTgtgFee)})` : ""}. Das Netto ist das, was TGTG euch tatsächlich auszahlt.`}
        />
      </div>

      {yearComparison.hasComparison && (
        <YearComparison
          monthLabels={yearComparison.monthLabels}
          lastComplete={yearComparison.lastComplete}
          currentYear={yearComparison.currentYear}
          prevYear={yearComparison.prevYear}
          lines={yearComparison.lines}
          ytd={yearComparison.ytd}
          projectedYearEnd={yearComparison.projectedYearEnd}
          prevYearFullTotal={yearComparison.prevYearFullTotal}
          perStream={yearComparison.perStream}
        />
      )}

      <Card className="mb-4">
        <CardHeader
          title="Umsatz im Überblick"
          subtitle={
            isSingleMonth
              ? `${rangeEndLabel} — Posten anklicken zum Ein-/Ausblenden`
              : `${rangeStartLabel} – ${rangeEndLabel} — Posten anklicken zum Ein-/Ausblenden`
          }
        />
        <CombinedRevenueChart data={streamComparison} />
      </Card>

      <Card>
        <CardHeader
          title="Standorte"
          subtitle={`Umsatz gesamt, ${rangeLabel}`}
        />
        {locationBar.length > 0 ? (
          <LocationBarChart data={locationBar} />
        ) : (
          <p className="text-sm text-ink/40 py-10 text-center">
            Noch keine Standort-Daten für diesen Zeitraum.
          </p>
        )}
      </Card>

      <p className="text-xs text-ink/35 mt-6">
        Rabatte gesamt ({rangeLabel}): {formatEur(kpis.currentDiscounts)}
        {" · "}
        &bdquo;vs. Vorjahr&ldquo; = Veränderung ggü. demselben Zeitraum im
        Vorjahr. &bdquo;Kein Vorjahr&ldquo; heißt: für diesen Zeitraum im
        Vorjahr liegt noch kein Wert in der Datenbank vor.
        {" · "}
        Mit &bdquo;von–bis&ldquo; oben kannst du jeden beliebigen Zeitraum
        anzeigen — die Kennzahlen oben sind dann die Summe über genau diese
        Monate, der Überblick zeigt sie einzeln. &bdquo;Vorjahr
        vergleichen&ldquo; blendet die gestrichelte Vorjahreslinie im Chart
        ein.
      </p>
    </div>
  );
}
