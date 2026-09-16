import { subMonths } from "date-fns";
import { buildDashboardData, buildYearComparison } from "@/lib/dashboard";
import { formatEur, sum, yoyPercent } from "@/lib/calculations";
import { QUICK_LINKS, periodStart } from "@/lib/constants";
import { getB2BMonthlyTotals, shiftYear } from "@/lib/b2b";
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

  const [{ streamComparison, locationBar, kpis, months }, yearComparison, b2bTotals] =
    await Promise.all([
      buildDashboardData({ from: fromPeriod, to: toPeriod }),
      buildYearComparison(),
      // Vorjahr mitladen, damit der Vergleich auch B2B und Catering enthält
      getB2BMonthlyTotals(shiftYear(fromPeriod, -1), toPeriod),
    ]);

  const rangeStartLabel = months[0]?.label ?? "";
  const rangeEndLabel = months[months.length - 1]?.label ?? "";
  const isSingleMonth = months.length <= 1;
  const rangeLabel = isSingleMonth
    ? rangeEndLabel
    : `${rangeStartLabel} – ${rangeEndLabel}`;

  // B2B und Catering als eigene Ströme in den Monatschart hängen. Die
  // Vorjahreslinie wird mit angehoben, sonst vergleicht sie ein Gesamt MIT
  // B2B gegen ein Vorjahr OHNE B2B.
  const chartData = streamComparison.map((row, i) => {
    const period = months[i]?.periodStart;
    const cur = period ? b2bTotals[period] : undefined;
    const prev = period ? b2bTotals[shiftYear(period, -1)] : undefined;
    return {
      ...row,
      B2B: cur?.b2b ?? 0,
      Catering: cur?.catering ?? 0,
      VorjahrGesamt:
        row.VorjahrGesamt == null
          ? null
          : row.VorjahrGesamt + (prev?.b2b ?? 0) + (prev?.catering ?? 0),
    };
  });

  const currentB2B = sum(chartData.map((r) => r.B2B));
  const currentCatering = sum(chartData.map((r) => r.Catering));

  const prevPeriods = months.map((m) => shiftYear(m.periodStart, -1));
  const hasPrevB2B = prevPeriods.some((p) => b2bTotals[p] != null);
  const prevB2B = hasPrevB2B
    ? sum(prevPeriods.map((p) => b2bTotals[p]?.b2b ?? 0))
    : null;
  const prevCatering = hasPrevB2B
    ? sum(prevPeriods.map((p) => b2bTotals[p]?.catering ?? 0))
    : null;

  // Gesamtumsatz inklusive B2B und Catering. Basis für den Vorjahresvergleich
  // ist die Summe der VorjahrGesamt-Werte plus Vorjahr-B2B/Catering — also
  // dieselbe Definition auf beiden Seiten.
  const totalWithB2B = kpis.currentTotal + currentB2B + currentCatering;
  const prevTotalRaw = streamComparison.every((r) => r.VorjahrGesamt == null)
    ? null
    : sum(streamComparison.map((r) => r.VorjahrGesamt));
  const prevTotalWithB2B =
    prevTotalRaw == null
      ? null
      : prevTotalRaw + (prevB2B ?? 0) + (prevCatering ?? 0);
  const totalYoyWithB2B = yoyPercent(totalWithB2B, prevTotalWithB2B);

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
          value={formatEur(totalWithB2B)}
          sub="alle Einkommensströme"
          yoy={totalYoyWithB2B}
          info={`Summe aus allen Einkommensströmen über ${rangeLabel}: Shops (Lunch-Locations), Shopify-Webshop, Lieferdienste (Wolt + Foodora), Too Good To Go (netto, nach TGTG-Gebühr), Projekte/Pop-ups, B2B (Handel + Kühlschränke) und Catering.`}
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
          label="B2B"
          value={formatEur(currentB2B)}
          sub="Handel + Kühlschränke"
          yoy={yoyPercent(currentB2B, prevB2B)}
          info={`Nettoumsatz der B2B-Kanäle über ${rangeLabel}: Gurkerl, Ototo, Alfies und Billa/REWE/Ja!Natürlich (Handel) sowie Schrankerl und Ritual Vend (Kühlschränke). Catering ist hier NICHT enthalten — das ist ein eigenes Geschäft und steht in der eigenen Kachel.`}
        />
        <StatTile
          label="Catering"
          value={formatEur(currentCatering)}
          sub="eigenes Geschäft"
          yoy={yoyPercent(currentCatering, prevCatering)}
          info={`Catering & Events über ${rangeLabel}, netto aus dem Odoo-Verkaufsbericht. Wird getrennt von B2B geführt, weil es ein eigenes Geschäft mit eigener Kalkulation ist.`}
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
        <CombinedRevenueChart data={chartData} />
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
        B2B und Catering kommen aus dem Odoo-Verkaufsbericht und werden unter
        &bdquo;B2B&ldquo; im Menü gepflegt. Die Jahresübersicht darunter
        vergleicht weiterhin nur die manuell erfassten Ströme.
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
