import { subMonths } from "date-fns";
import { buildDashboardData, buildYearComparison } from "@/lib/dashboard";
import { formatEur } from "@/lib/calculations";
import { yoyErklaerung } from "@/lib/vergleich";
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Umsatz gesamt"
          value={formatEur(kpis.currentTotal)}
          sub="alle Einkommensströme"
          yoy={kpis.totalYoy}
          info={`Summe aus allen Einkommensströmen über ${rangeLabel}: Shops (Lunch-Locations), Shopify-Webshop, Lieferdienste (Wolt + Foodora), B2B (Handel + Kühlschränke), Catering, Too Good To Go (netto) und Projekte/Pop-ups. ${yoyErklaerung(kpis.totalYoy, "Vorjahresvergleich")}`}
        />
        <StatTile
          label="Shops"
          value={formatEur(kpis.currentShops)}
          sub="alle Standorte"
          yoy={kpis.shopsYoy}
          info={`Umsatz aus allen Lunch-Locations vor Ort, ${rangeLabel} zusammengerechnet. ${yoyErklaerung(kpis.shopsYoy, "Vorjahresvergleich")}`}
        />
        <StatTile
          label="Shopify"
          value={formatEur(kpis.currentShopify)}
          sub="Webshop netto"
          yoy={kpis.shopifyYoy}
          info={`Der Auszahlungsbetrag aus dem Webshop karmafood.at über ${rangeLabel} (nach Shopify-Gebühren). ${yoyErklaerung(kpis.shopifyYoy, "Vorjahresvergleich")}`}
        />
        <StatTile
          label="Lieferdienste"
          value={formatEur(kpis.currentDelivery)}
          sub="Wolt + Foodora"
          yoy={kpis.deliveryYoy}
          info={`Auszahlungen von Wolt und Foodora zusammen über ${rangeLabel}; die Provisionen der Plattformen sind schon abgezogen. ${yoyErklaerung(kpis.deliveryYoy, "Vorjahresvergleich")}`}
        />
        <StatTile
          label="B2B"
          value={formatEur(kpis.currentB2B)}
          sub="Handel + Kühlschränke"
          yoy={kpis.b2bYoy}
          info={`Nettoumsatz der B2B-Kanäle über ${rangeLabel}: Gurkerl, Ototo, Alfies und Billa/REWE/Ja!Natürlich (Handel) sowie Schrankerl und Ritual Vend (Kühlschränke). Catering ist hier NICHT enthalten — das ist ein eigenes Geschäft und steht in der eigenen Kachel. ${yoyErklaerung(kpis.b2bYoy, "Vorjahresvergleich")}`}
        />
        <StatTile
          label="Catering"
          value={formatEur(kpis.currentCatering)}
          sub="eigenes Geschäft"
          yoy={kpis.cateringYoy}
          info={`Catering & Events über ${rangeLabel}, netto aus dem Odoo-Verkaufsbericht. Wird getrennt von B2B geführt, weil es ein eigenes Geschäft mit eigener Kalkulation ist. ${yoyErklaerung(kpis.cateringYoy, "Vorjahresvergleich")}`}
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
          info={`Netto-Auszahlung von Too Good To Go über ${rangeLabel}: Verkaufswert der geretteten Überraschungssackerl${kpis.currentTgtgGross != null ? ` (Brutto ${formatEur(kpis.currentTgtgGross)})` : ""} minus TGTG-Reservierungsgebühr${kpis.currentTgtgFee != null ? ` (${formatEur(kpis.currentTgtgFee)})` : ""}. ${yoyErklaerung(kpis.tgtgYoy, "Vorjahresvergleich")}`}
        />
        <StatTile
          label="Rabatte"
          value={formatEur(kpis.currentDiscounts)}
          sub="in den Shops gewährt"
          info={`Summe aller in den Lunch-Locations gewährten Rabatte über ${rangeLabel}. Nicht im Umsatz oben enthalten — der ist bereits netto nach Rabatt.`}
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
        &bdquo;Umsatz gesamt&ldquo; enthält alle Ströme inklusive B2B und
        Catering — der Jahresvergleich darunter rechnet mit derselben
        Definition.
        {" · "}
        Jeder Prozentwert nennt sein Vergleichsfenster (&bdquo;vs. Jän–Aug
        25&ldquo;). Verglichen werden nur Monate, für die in beiden Jahren
        Zahlen erfasst sind; der laufende, noch nicht abgeschlossene Monat
        bleibt außen vor. Steht &bdquo;kein Vorjahr&ldquo;, gibt es für diesen
        Zeitraum keine vergleichbare Vorjahresbasis.
        {" · "}
        Mit &bdquo;von–bis&ldquo; oben lässt sich jeder Zeitraum anzeigen — die
        Kennzahlen sind dann die Summe über genau diese Monate, der Überblick
        zeigt sie einzeln.
      </p>
    </div>
  );
}
