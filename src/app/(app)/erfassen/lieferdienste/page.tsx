import {
  ACTIVE_LOCATIONS,
  periodStart,
  monthLabel,
  QUICK_LINKS,
} from "@/lib/constants";
import {
  getWoltPayoutsForPeriod,
  getFoodoraMonthly,
  getFoodoraPayoutsForPeriod,
} from "@/lib/data";
import { PeriodPicker } from "@/components/erfassen/PeriodPicker";
import { WoltForm } from "@/components/erfassen/WoltForm";
import { FoodoraForm } from "@/components/erfassen/FoodoraForm";
import { QuickLinks } from "@/components/ui/QuickLinks";
import { LieferdiensteTabs } from "@/components/erfassen/LieferdiensteTabs";

const links = QUICK_LINKS.filter(
  (l) => l.key === "wolt" || l.key === "foodora",
);

export default async function LieferdienstePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;
  const period = periodStart(year, month);

  const woltLocations = ACTIVE_LOCATIONS.filter((l) => l.hasWolt);
  const foodoraLocations = ACTIVE_LOCATIONS.filter((l) => l.hasFoodora);

  const [woltPayouts, foodoraMonthly, foodoraPayouts] = await Promise.all([
    getWoltPayoutsForPeriod(period),
    getFoodoraMonthly(period),
    getFoodoraPayoutsForPeriod(period),
  ]);

  const woltByLocation = Object.fromEntries(
    woltPayouts.map((p) => [p.location_code, p.payout_amount]),
  );
  const foodoraByLocation = Object.fromEntries(
    foodoraPayouts.map((p) => [p.location_code, p.payout_amount]),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-xl">Lieferdienste</h1>
          <p className="text-sm text-ink/50 mt-1">
            Wolt &amp; Foodora — {monthLabel(month)} {year}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <LieferdiensteTabs />
          <PeriodPicker year={year} month={month} />
        </div>
      </div>

      <div className="mb-6">
        <QuickLinks links={links} />
      </div>

      <div className="flex flex-col gap-4">
        <WoltForm
          locations={woltLocations}
          periodStart={period}
          initialByLocation={woltByLocation}
        />
        <FoodoraForm
          locations={foodoraLocations}
          periodStart={period}
          initial={foodoraMonthly}
          initialByLocation={foodoraByLocation}
        />
      </div>
    </div>
  );
}
