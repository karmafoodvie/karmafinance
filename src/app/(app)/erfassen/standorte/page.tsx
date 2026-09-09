import { subMonths } from "date-fns";
import {
  ACTIVE_LOCATIONS,
  LOCATIONS,
  periodStart,
  monthLabel,
} from "@/lib/constants";
import { getLocationMonthlyForPeriod } from "@/lib/data";
import { buildProductData, getProductCategories } from "@/lib/products";
import { PeriodPicker } from "@/components/erfassen/PeriodPicker";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { LocationMonthlyForm } from "@/components/erfassen/LocationMonthlyForm";
import { ProductExplorer } from "@/components/shops/ProductExplorer";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { formatEur, formatNumber } from "@/lib/calculations";

export default async function ShopsPage({
  searchParams,
}: {
  searchParams: Promise<{
    fromYear?: string;
    fromMonth?: string;
    toYear?: string;
    toMonth?: string;
    year?: string;
    month?: string;
    loc?: string;
    cat?: string;
  }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const defaultFrom = subMonths(now, 11);

  // Zeitraum für die Produktauswertung oben.
  const fromYear = Number(params.fromYear) || defaultFrom.getFullYear();
  const fromMonth = Number(params.fromMonth) || defaultFrom.getMonth() + 1;
  const toYear = Number(params.toYear) || now.getFullYear();
  const toMonth = Number(params.toMonth) || now.getMonth() + 1;

  let fromPeriod = periodStart(fromYear, fromMonth);
  let toPeriod = periodStart(toYear, toMonth);
  if (fromPeriod > toPeriod) {
    [fromPeriod, toPeriod] = [toPeriod, fromPeriod];
  }

  // Separater Monat für die Umsatz-Erfassung weiter unten.
  const entryYear = Number(params.year) || now.getFullYear();
  const entryMonth = Number(params.month) || now.getMonth() + 1;
  const entryPeriod = periodStart(entryYear, entryMonth);
  const prevYearPeriod = periodStart(entryYear - 1, entryMonth);

  const activeLocation = params.loc ?? "";
  const activeCategory = params.cat ?? "";

  const [product, categories, entries, prevYearEntries] = await Promise.all([
    buildProductData(
      { from: fromPeriod, to: toPeriod },
      activeLocation || undefined,
      activeCategory || undefined,
    ),
    getProductCategories(),
    getLocationMonthlyForPeriod(entryPeriod),
    getLocationMonthlyForPeriod(prevYearPeriod),
  ]);

  const entryByLocation = Object.fromEntries(
    entries.map((e) => [e.location_code, e]),
  );
  const prevYearByLocation = Object.fromEntries(
    prevYearEntries.map((e) => [e.location_code, e.revenue_net]),
  );

  const rangeStartLabel = product.months[0]?.label ?? "";
  const rangeEndLabel = product.months[product.months.length - 1]?.label ?? "";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-xl">Shops</h1>
          <p className="text-sm text-ink/50 mt-1">
            Lunch-Locations — Produktentwicklung und Monatsumsätze
          </p>
        </div>
        <DateRangePicker
          fromYear={fromYear}
          fromMonth={fromMonth}
          toYear={toYear}
          toMonth={toMonth}
        />
      </div>

      {product.hasData ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <StatTile
              label="Umsatz"
              value={formatEur(product.totals.revenue)}
              sub={`${rangeStartLabel} – ${rangeEndLabel}`}
              info="Summe aller Produktumsätze im gewählten Zeitraum, inkl. Rabattzeilen (die sind negativ). Entspricht dem Shop-Umsatz aus dem Kassensystem."
            />
            <StatTile
              label="Verkaufte Stück"
              value={formatNumber(Math.round(product.totals.quantity))}
              sub="alle Produkte"
              info="Summe der verkauften Mengen über alle Produkte und Standorte im gewählten Zeitraum."
            />
            <StatTile
              label="Marge"
              value={formatEur(product.totals.margin)}
              sub="laut Kassensystem"
              info="Summe der im Odoo-POS hinterlegten Margen. Hängt davon ab, wie gepflegt die Einkaufspreise im Kassensystem sind."
            />
          </div>

          <ProductExplorer
            summaries={product.summaries}
            trendProducts={product.trendProducts}
            revenueTrend={product.revenueTrend}
            quantityTrend={product.quantityTrend}
            locations={ACTIVE_LOCATIONS}
            categories={categories}
            activeLocation={activeLocation}
            activeCategory={activeCategory}
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
