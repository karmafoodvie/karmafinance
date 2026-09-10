import { subMonths } from "date-fns";
import {
  ACTIVE_LOCATIONS,
  LOCATIONS,
  periodStart,
  monthLabel,
} from "@/lib/constants";
import { getLocationMonthlyForPeriod } from "@/lib/data";
import {
  buildProductData,
  buildGroupByLocation,
  getProductCategories,
  PRODUCT_GROUPS,
} from "@/lib/products";
import { PeriodPicker } from "@/components/erfassen/PeriodPicker";
import { LocationMonthlyForm } from "@/components/erfassen/LocationMonthlyForm";
import { ProductExplorer } from "@/components/shops/ProductExplorer";
import { GroupByStore } from "@/components/shops/GroupByStore";
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
    locs?: string;
    cat?: string;
    grp?: string;
    typ?: string;
    storegrp?: string;
    storetyp?: string;
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

  // Shop-Mehrfachauswahl: leer/fehlend = alle Shops. Nur gültige Codes
  // zulassen, damit kein Unfug aus der URL durchrutscht.
  const allLocationCodes = LOCATIONS.map((l) => l.code);
  const selectedLocations = (params.locs ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((c) => allLocationCodes.includes(c as (typeof allLocationCodes)[number]));
  const activeLocations =
    selectedLocations.length > 0 ? selectedLocations : allLocationCodes;
  const allSelected = activeLocations.length === allLocationCodes.length;
  const activeCategory = params.cat ?? "";

  // Überkategorie-Filter (nur gültige Werte zulassen).
  const groupList: string[] = [...PRODUCT_GROUPS];
  const activeGroup = groupList.includes(params.grp ?? "") ? (params.grp as string) : "";
  const activeType =
    activeGroup === "Hauptgerichte" && (params.typ === "Classic" || params.typ === "Special")
      ? params.typ
      : "";

  // "Pro Standort"-Ansicht: eigene Gruppe, Standard = Lunch Combos.
  const storeGroup = groupList.includes(params.storegrp ?? "")
    ? (params.storegrp as string)
    : "Lunch Combos";
  const storeType =
    storeGroup === "Hauptgerichte" && (params.storetyp === "Classic" || params.storetyp === "Special")
      ? params.storetyp
      : "";

  const [product, categories, byStore, entries, prevYearEntries] = await Promise.all([
    buildProductData(
      { from: fromPeriod, to: toPeriod },
      allSelected ? undefined : activeLocations,
      activeCategory || undefined,
      activeGroup || undefined,
      activeType || undefined,
    ),
    getProductCategories(),
    buildGroupByLocation(
      { from: fromPeriod, to: toPeriod },
      storeGroup,
      ACTIVE_LOCATIONS.map((l) => ({ code: l.code, shortName: l.shortName })),
      storeType || undefined,
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

  const rangeStartLabel = product.months[0]?.label ?? "";
  const rangeEndLabel = product.months[product.months.length - 1]?.label ?? "";

  return (
    <div>
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
            locations={LOCATIONS}
            categories={categories}
            groupTotals={product.groupTotals}
            activeLocations={activeLocations}
            activeCategory={activeCategory}
            activeGroup={activeGroup}
            activeType={activeType}
          />

          <GroupByStore
            group={storeGroup}
            groups={groupList}
            activeType={storeType}
            storeKeys={byStore.storeKeys}
            revenueTrend={byStore.revenueTrend}
            quantityTrend={byStore.quantityTrend}
            storeTotals={byStore.storeTotals}
            hasData={byStore.hasData}
            rangeLabel={`${rangeStartLabel} – ${rangeEndLabel}`}
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
