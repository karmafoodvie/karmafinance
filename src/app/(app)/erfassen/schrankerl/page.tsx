import { periodStart, monthLabel } from "@/lib/constants";
import { getSchrankelrMonthly } from "@/lib/data";
import { PeriodPicker } from "@/components/erfassen/PeriodPicker";
import { SchrankelrForm } from "@/components/erfassen/SchrankelrForm";

export default async function SchrankelrPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;
  const period = periodStart(year, month);

  const schrankelrMonthly = await getSchrankelrMonthly(period);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-xl">Schrankerl</h1>
          <p className="text-sm text-ink/50 mt-1">
            Vending-Kühlschrank — {monthLabel(month)} {year}
          </p>
        </div>
        <PeriodPicker year={year} month={month} />
      </div>

      <SchrankelrForm periodStart={period} initial={schrankelrMonthly} />
    </div>
  );
}
