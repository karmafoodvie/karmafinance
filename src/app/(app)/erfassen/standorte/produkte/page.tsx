import { ACTIVE_LOCATIONS, LOCATIONS } from "@/lib/constants";
import {
  buildProductData,
  buildGroupByLocation,
  getProductCategories,
  PRODUCT_GROUPS,
} from "@/lib/products";
import { buildBasketData } from "@/lib/basket";
import { resolveShopsParams, type ShopsSearchParams } from "@/lib/shopsParams";
import { formatEur, formatNumber } from "@/lib/calculations";
import { StatTile } from "@/components/ui/StatTile";
import { Card } from "@/components/ui/Card";
import { ProductExplorer } from "@/components/shops/ProductExplorer";
import { ProductStoreCompare } from "@/components/shops/ProductStoreCompare";
import { GroupByStore } from "@/components/shops/GroupByStore";

interface Params extends ShopsSearchParams {
  cat?: string;
  grp?: string;
  typ?: string;
  storegrp?: string;
  storetyp?: string;
  prod?: string;
}

export default async function ProduktePage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const p = resolveShopsParams(params);
  const activeCategory = params.cat ?? "";

  const groupList: string[] = [...PRODUCT_GROUPS];
  const activeGroup = groupList.includes(params.grp ?? "") ? (params.grp as string) : "";
  const activeType =
    activeGroup === "Hauptgerichte" && (params.typ === "Classic" || params.typ === "Special")
      ? params.typ
      : "";

  const storeGroup = groupList.includes(params.storegrp ?? "")
    ? (params.storegrp as string)
    : "Lunch Combos";
  const storeType =
    storeGroup === "Hauptgerichte" &&
    (params.storetyp === "Classic" || params.storetyp === "Special")
      ? params.storetyp
      : "";

  const [product, categories, byStore, basket] = await Promise.all([
    buildProductData(
      { from: p.fromPeriod, to: p.toPeriod },
      p.locationFilter,
      activeCategory || undefined,
      activeGroup || undefined,
      activeType || undefined,
    ),
    getProductCategories(),
    buildGroupByLocation(
      { from: p.fromPeriod, to: p.toPeriod },
      storeGroup,
      ACTIVE_LOCATIONS.map((l) => ({ code: l.code, shortName: l.shortName })),
      storeType || undefined,
    ),
    buildBasketData(
      { from: p.fromPeriod, to: p.toPeriod },
      p.fromDate,
      p.toDate,
      p.locationFilter,
      params.prod,
    ),
  ]);

  if (!product.hasData) {
    return (
      <Card>
        <p className="text-sm text-ink/50 py-6 text-center">
          Für {p.rangeLabel} liegen keine Produktdaten vor — für andere Zeiträume
          den Pivot-Export &bdquo;Kassensystemanalyse&ldquo; aus Odoo schicken.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatTile
          label="Umsatz"
          value={formatEur(product.totals.revenue)}
          sub={p.rangeLabel}
          info="Summe aller Produktumsätze im gewählten Zeitraum, inkl. Rabattzeilen (die sind negativ)."
        />
        <StatTile
          label="Verkaufte Stück"
          value={formatNumber(Math.round(product.totals.quantity))}
          sub="alle Produkte"
          info="Summe der verkauften Mengen über alle Produkte und die gewählten Shops."
        />
        <StatTile
          label="Marge"
          value={formatEur(product.totals.margin)}
          sub="laut Kassensystem"
          info="Summe der im Odoo-POS hinterlegten Margen. Hängt davon ab, wie gepflegt die Einkaufspreise im Kassensystem sind."
        />
      </div>

      <ProductStoreCompare
        topByStore={basket.topByStore}
        selectableProducts={basket.selectableProducts}
        activeProduct={basket.activeProduct}
        productByStore={basket.productByStore}
        rangeLabel={p.rangeLabel}
      />

      <ProductExplorer
        summaries={product.summaries}
        trendProducts={product.trendProducts}
        revenueTrend={product.revenueTrend}
        quantityTrend={product.quantityTrend}
        locations={LOCATIONS}
        categories={categories}
        groupTotals={product.groupTotals}
        activeLocations={p.activeLocations}
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
        rangeLabel={p.rangeLabel}
      />

      <p className="text-xs text-ink/35 mt-6">
        Produktdaten kommen aus dem Odoo-Pivot-Export
        &bdquo;Kassensystemanalyse&ldquo; und liegen auf Monatsebene.
        {" · "}
        Rabatt- und Gutscheinzeilen stehen mit negativem Betrag drin und sind im
        Umsatz oben bereits abgezogen; in den Top-5-Listen sind sie
        herausgefiltert.
      </p>
    </div>
  );
}
