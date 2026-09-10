import { getWoltSeries, getFoodoraPayoutSeries } from "@/lib/data";
import { LieferdiensteCharts } from "@/components/charts/LieferdiensteCharts";
import { LieferdiensteTabs } from "@/components/erfassen/LieferdiensteTabs";

export default async function LieferdiensteUebersichtPage() {
  const FROM = "2025-01-01";

  const [woltPayouts, foodoraPayouts] = await Promise.all([
    getWoltSeries(FROM),
    getFoodoraPayoutSeries(FROM),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-xl">Lieferdienste</h1>
          <p className="text-sm text-ink/50 mt-1">
            Wolt &amp; Foodora — Aug 2025 bis Aug 2026
          </p>
        </div>
        <LieferdiensteTabs />
      </div>

      <LieferdiensteCharts woltPayouts={woltPayouts} foodoraPayouts={foodoraPayouts} />
    </div>
  );
}
