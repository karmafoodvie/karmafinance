import { buildDashboardData } from "@/lib/dashboard";
import { formatEur } from "@/lib/calculations";
import { QUICK_LINKS } from "@/lib/constants";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { QuickLinks } from "@/components/ui/QuickLinks";
import { RevenueTrendChart } from "@/components/charts/RevenueTrendChart";
import { StreamComparisonChart } from "@/components/charts/StreamComparisonChart";
import { LocationBarChart } from "@/components/charts/LocationBarChart";

export default async function DashboardPage() {
  const { revenueTrend, streamComparison, locationBar, kpis } =
    await buildDashboardData();

  const currentMonthLabel = revenueTrend[revenueTrend.length - 1]?.label ?? "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-xl">Dashboard</h1>
        <p className="text-sm text-ink/50 mt-1">
          Gesamtüberblick — aktueller Monat: {currentMonthLabel}
        </p>
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
        />
        <StatTile
          label="Shops"
          value={formatEur(kpis.currentShops)}
          sub="alle Standorte"
        />
        <StatTile
          label="Shopify"
          value={formatEur(kpis.currentShopify)}
          yoy={kpis.shopifyYoy}
        />
        <StatTile
          label="Lieferdienste"
          value={formatEur(kpis.currentDelivery)}
          sub="Wolt + Foodora"
          yoy={kpis.deliveryYoy}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Umsatzverlauf"
            subtitle="Letzte 12 Monate, gesamt (alle Streams)"
          />
          <RevenueTrendChart data={revenueTrend} />
        </Card>
        <Card>
          <CardHeader title="Standorte" subtitle="Umsatz aktueller Monat" />
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
          subtitle="Shops vs. Shopify vs. Lieferdienste, pro Monat"
        />
        <StreamComparisonChart data={streamComparison} />
      </Card>

      <p className="text-xs text-ink/35 mt-6">
        Rabatte gesamt (aktueller Monat): {formatEur(kpis.currentDiscounts)}
      </p>
    </div>
  );
}
