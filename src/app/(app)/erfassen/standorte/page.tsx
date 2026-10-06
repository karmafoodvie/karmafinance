import { ACTIVE_LOCATIONS, LOCATIONS, periodStart, monthLabel } from "@/lib/constants";
import { getLocationMonthlyForPeriod } from "@/lib/data";
import { buildGesamtstrom } from "@/lib/products";
import { resolveShopsParams, type ShopsSearchParams } from "@/lib/shopsParams";
import { PeriodPicker } from "@/components/erfassen/PeriodPicker";
import { LocationMonthlyForm } from "@/components/erfassen/LocationMonthlyForm";
import { GesamtstromOverview } from "@/components/shops/GesamtstromOverview";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { formatEur, formatNumber } from "@/lib/calculations";

export default async function ShopsPage({
  searchParams,
}: {
  searchParams: Promise<ShopsSearchParams & { year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();

  // Zeitraum und Shop-Auswahl kommen aus der gemeinsamen Filterleiste
  // (ShopsNav) — gleiche Auswertung wie in allen anderen Shops-Reitern.
  const p = resolveShopsParams(params);

  // Separater Monat für die Umsatz-Erfassung weiter unten.
  const entryYear = Number(params.year) || now.getFullYear();
  const entryMonth = Number(params.month) || now.getMonth() + 1;
  const entryPeriod = periodStart(entryYear, entryMonth);
  const prevYearPeriod = periodStart(entryYear - 1, entryMonth);

  const [gesamt, entries, prevYearEntries] = await Promise.all([
    buildGesamtstrom(
      { from: p.fromPeriod, to: p.toPeriod },
      // alle Standorte inkl. historischer (z.B. Neustiftgasse) in der Auswertung
      LOCATIONS.map((l) => ({ code: l.code, shortName: l.shortName })),
      p.locationFilter,
    ),
    getLocationMonthlyForPeriod(entryPeriod),
    getLocationMonthlyForPeriod(prevYearPeriod),
  ]);

  const entryByLocation = Object.fromEntries(
    entries.map((e) => [e.location_code, e]),
  );
  const prevYearByLocation = Object.fromEntries(
    prevYearEntries.map((e) => [e.location_code, e.revenue_net]),
  );

  const rangeStartLabel = gesamt.months[0]?.label ?? "";
  const rangeEndLabel = gesamt.months[gesamt.months.length - 1]?.label ?? "";
  const rangeLabel = `${rangeStartLabel} – ${rangeEndLabel}`;

  // Aktuelle Filter für den Sprung in die Details (Produkte-Reiter).
  const detailQuery = new URLSearchParams(
    Object.entries({
      fromYear: params.fromYear,
      fromMonth: params.fromMonth,
      toYear: params.toYear,
      toMonth: params.toMonth,
      locs: params.locs,
    }).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();

  return (
    <div>
      {gesamt.hasData ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatTile
              label="Umsatz"
              value={formatEur(gesamt.totals.revenue)}
              sub={rangeLabel}
              info="Summe aller Produktumsätze der gewählten Shops im gewählten Zeitraum, inkl. Rabattzeilen (die sind negativ). Entspricht dem Shop-Umsatz aus dem Kassensystem."
            />
            <StatTile
              label="Ø Umsatz pro Monat"
              value={gesamt.avgPerMonth != null ? formatEur(gesamt.avgPerMonth) : "–"}
              sub={`über ${gesamt.monthsWithData} Monat${gesamt.monthsWithData === 1 ? "" : "e"} mit Daten`}
              info="Gesamtumsatz geteilt durch die Monate, für die Produktdaten vorliegen — leere Monate drücken den Schnitt nicht."
            />
            <StatTile
              label="Verkaufte Stück"
              value={formatNumber(Math.round(gesamt.totals.quantity))}
              sub="alle Produkte"
              info="Summe der verkauften Mengen über alle Produkte und gewählten Standorte im gewählten Zeitraum."
            />
            <StatTile
              label="Marge"
              value={formatEur(gesamt.totals.margin)}
              sub="laut Kassensystem"
              info="Summe der im Odoo-POS hinterlegten Margen. Hängt davon ab, wie gepflegt die Einkaufspreise im Kassensystem sind."
            />
          </div>

          <GesamtstromOverview
            chartGroups={gesamt.chartGroups}
            revenueTrend={gesamt.revenueTrend}
            quantityTrend={gesamt.quantityTrend}
            groupRows={gesamt.groupRows}
            storeRows={gesamt.storeRows}
            rangeLabel={rangeLabel}
            detailQuery={detailQuery}
          />
        </>
      ) : (
        <Card className="mb-6">
          <p className="text-sm text-ink/50 py-6 text-center">
            Für diesen Zeitraum liegen keine Produktdaten vor. Aktuell ist das
            Jahr 2025 importiert — für andere Zeiträume den Pivot-Export
            &bdquo;Kassensystemanalyse&ldquo; aus Odoo schicken.
          </p>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader
          title="Monatsumsatz erfassen"
          subtitle={`${monthLabel(entryMonth)} ${entryYear} — Gesamtumsatz pro Shop`}
          action={<PeriodPicker year={entryYear} month={entryMonth} />}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ACTIVE_LOCATIONS.map((loc) => (
            <LocationMonthlyForm
              key={loc.code}
              locationCode={loc.code}
              locationName={loc.name}
              periodStart={entryPeriod}
              initial={entryByLocation[loc.code] ?? null}
              prevYearActual={prevYearByLocation[loc.code] ?? null}
            />
          ))}
        </div>
      </Card>

      <p className="text-xs text-ink/35 mt-6">
        Produktdaten kommen aus dem Odoo-Pivot-Export
        &bdquo;Kassensystemanalyse&ldquo; und sind auf Monatsebene abgelegt.
        {" · "}
        Kategorie &bdquo;Rabatt&ldquo; sind Rabatt- und Gutscheinzeilen aus dem
        Kassensystem — die stehen mit negativem Betrag drin und sind im
        Umsatz oben bereits abgezogen.
        {" · "}
        {LOCATIONS.length - ACTIVE_LOCATIONS.length > 0 &&
          "Neustiftgasse (1070) ist geschlossen und wird nicht mehr erfasst, historische Zahlen bleiben aber in der Auswertung."}
      </p>
    </div>
  );
}
