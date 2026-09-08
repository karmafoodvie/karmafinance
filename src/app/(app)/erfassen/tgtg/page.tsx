import { subMonths } from "date-fns";
import { TGTG_LOCATIONS, periodStart, QUICK_LINKS } from "@/lib/constants";
import { buildTgtgDashboardData } from "@/lib/dashboard";
import { getTgtgPayoutsForPeriod } from "@/lib/data";
import { formatEur, formatNumber } from "@/lib/calculations";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { QuickLinks } from "@/components/ui/QuickLinks";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { PeriodPicker } from "@/components/erfassen/PeriodPicker";
import { TgtgForm } from "@/components/erfassen/TgtgForm";
import { RevenueTrendChart } from "@/components/charts/RevenueTrendChart";
import { TgtgLocationTrendChart } from "@/components/charts/TgtgLocationTrendChart";
import { MealsTrendChart } from "@/components/charts/MealsTrendChart";

const links = QUICK_LINKS.filter((l) => l.key === "tgtg");

export default async function TgtgPage({
  searchParams,
}: {
  searchParams: Promise<{
    fromYear?: string;
    fromMonth?: string;
    toYear?: string;
    toMonth?: string;
    year?: string;
    month?: string;
  }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const defaultFrom = subMonths(now, 11);

  // Zeitraum für die Auswertung/Charts oben.
  const fromYear = Number(params.fromYear) || defaultFrom.getFullYear();
  const fromMonth = Number(params.fromMonth) || defaultFrom.getMonth() + 1;
  const toYear = Number(params.toYear) || now.getFullYear();
  const toMonth = Number(params.toMonth) || now.getMonth() + 1;

  let fromPeriod = periodStart(fromYear, fromMonth);
  let toPeriod = periodStart(toYear, toMonth);
  if (fromPeriod > toPeriod) {
    [fromPeriod, toPeriod] = [toPeriod, fromPeriod];
  }

  // Separater Monat für die manuelle Eintragung weiter unten.
  const entryYear = Number(params.year) || now.getFullYear();
  const entryMonth = Number(params.month) || now.getMonth() + 1;
  const entryPeriod = periodStart(entryYear, entryMonth);

  const [{ months, netTrend, mealsTrend, locationTrend, locationKeys, hasAnyData, kpis }, entryPayouts] =
    await Promise.all([
      buildTgtgDashboardData({ from: fromPeriod, to: toPeriod }),
      getTgtgPayoutsForPeriod(entryPeriod),
    ]);

  const rangeStartLabel = months[0]?.label ?? "";
  const rangeEndLabel = months[months.length - 1]?.label ?? "";
  const isSingleMonth = months.length <= 1;
  const entryByLocation = Object.fromEntries(
    entryPayouts.map((p) => [p.location_code, p]),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-xl">Too Good To Go</h1>
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

      <div className="mb-6">
        <QuickLinks links={links} />
      </div>

      {!hasAnyData ? (
        <Card>
          <p className="text-sm text-ink/50 py-6 text-center">
            Für den gewählten Zeitraum liegen noch keine TGTG-Daten vor.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatTile
              label="Netto"
              value={formatEur(kpis.currentNet)}
              sub="tatsächliche Auszahlung"
              yoy={kpis.netYoy}
              info={`Brutto minus TGTG-Reservierungsgebühr für ${rangeEndLabel} — das ist der Betrag, den TGTG tatsächlich auszahlt.`}
            />
            <StatTile
              label="Brutto"
              value={formatEur(kpis.currentGross)}
              sub="Verkaufswert"
              info={`Verkaufswert aller geretteten Sackerl für ${rangeEndLabel}, vor Abzug der TGTG-Gebühr.`}
            />
            <StatTile
              label="TGTG-Gebühr"
              value={formatEur(kpis.currentFee)}
              sub="inkl. USt."
              info={`Reservierungsgebühr, die TGTG für ${rangeEndLabel} einbehält (inkl. 20 % USt.).`}
            />
            <StatTile
              label="Gerettete Sackerl"
              value={formatNumber(kpis.currentMeals)}
              yoy={kpis.mealsYoy}
              info={`Anzahl geretteter Überraschungssackerl über alle Standorte für ${rangeEndLabel}.`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader
                title="Netto-Entwicklung"
                subtitle={
                  isSingleMonth
                    ? `${rangeEndLabel}`
                    : `${rangeStartLabel} – ${rangeEndLabel}`
                }
              />
              <RevenueTrendChart data={netTrend} />
            </Card>
            <Card>
              <CardHeader
                title="Gerettete Sackerl"
                subtitle={
                  isSingleMonth
                    ? `${rangeEndLabel}`
                    : `${rangeStartLabel} – ${rangeEndLabel}`
                }
              />
              <MealsTrendChart data={mealsTrend} />
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader
              title="Pro Standort"
              subtitle={`Netto-Umsatz, ${rangeStartLabel} – ${rangeEndLabel}`}
            />
            <TgtgLocationTrendChart data={locationTrend} keys={locationKeys} />
          </Card>
        </>
      )}

      <Card className="mb-4">
        <CardHeader
          title="Einzelnen Monat nachtragen"
          subtitle="Nur nötig, falls für einen Monat noch keine TGTG-Unterlagen vorliegen"
        />
        <div className="flex items-center gap-3 mb-4">
          <PeriodPicker year={entryYear} month={entryMonth} />
        </div>
        <p className="text-sm text-ink/50 mb-4 max-w-2xl">
          Die Werte findest du im TGTG Business-Portal unter{" "}
          <span className="font-medium text-ink/70">Finanzen → Monatliche
          Abrechnungsdokumente</span> — dort rechts in der Zeile des Monats
          &bdquo;Kontoauszug&ldquo; und &bdquo;Rechnung&ldquo; exportieren.
          Brutto = Verkaufswert der geretteten Sackerl (Summe der
          Sackerl-Zeilen im Kontoauszug für diesen Standort). TGTG-Gebühr =
          Reservierungsgebühr aus der Rechnung für diesen Standort, inkl. 20 %
          USt. (Nettobetrag der Rechnungszeilen × 1,2). Netto wird automatisch
          berechnet.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {TGTG_LOCATIONS.map((loc) => (
            <TgtgForm
              key={loc.code}
              locationCode={loc.code}
              locationName={loc.name}
              periodStart={entryPeriod}
              initial={entryByLocation[loc.code] ?? null}
            />
          ))}
        </div>
      </Card>

      <p className="text-xs text-ink/35">
        Neustiftgasse ist als Shop-Standort historisch, hatte auf TGTG aber
        bis Juni 2026 noch laufenden Umsatz — deshalb hier weiterhin
        gelistet.
        {" · "}
        YoY = Veränderung ggü. demselben Monat im Vorjahr.
        {" · "}
        Mit &bdquo;von–bis&ldquo; oben kannst du jeden beliebigen Zeitraum
        anzeigen.
      </p>
    </div>
  );
}
