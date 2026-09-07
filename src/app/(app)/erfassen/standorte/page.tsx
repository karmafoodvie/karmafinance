import { ACTIVE_LOCATIONS, periodStart, monthLabel } from "@/lib/constants";
import { getLocationMonthlyForPeriod } from "@/lib/data";
import { PeriodPicker } from "@/components/erfassen/PeriodPicker";
import { LocationMonthlyForm } from "@/components/erfassen/LocationMonthlyForm";

export default async function StandortePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;
  const period = periodStart(year, month);
  const prevYearPeriod = periodStart(year - 1, month);

  const [entries, prevYearEntries] = await Promise.all([
    getLocationMonthlyForPeriod(period),
    getLocationMonthlyForPeriod(prevYearPeriod),
  ]);

  const entryByLocation = Object.fromEntries(
    entries.map((e) => [e.location_code, e]),
  );
  const prevYearByLocation = Object.fromEntries(
    prevYearEntries.map((e) => [e.location_code, e.revenue_net]),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-xl">Standorte</h1>
          <p className="text-sm text-ink/50 mt-1">
            Monatswerte pro Lunch-Location — {monthLabel(month)} {year}
          </p>
        </div>
        <PeriodPicker year={year} month={month} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ACTIVE_LOCATIONS.map((loc) => (
          <LocationMonthlyForm
            key={loc.code}
            locationCode={loc.code}
            locationName={loc.name}
            periodStart={period}
            initial={entryByLocation[loc.code] ?? null}
            prevYearActual={prevYearByLocation[loc.code] ?? null}
          />
        ))}
      </div>

      <p className="text-xs text-ink/35 mt-6">
        Neustiftgasse (1070) ist als historischer Standort geschlossen und
        wird hier nicht mehr erfasst.
      </p>
    </div>
  );
}
