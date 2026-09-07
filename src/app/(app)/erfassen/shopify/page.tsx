import { periodStart, monthLabel } from "@/lib/constants";
import { getShopifyMonthly } from "@/lib/data";
import { PeriodPicker } from "@/components/erfassen/PeriodPicker";
import { ShopifyMonthlyForm } from "@/components/erfassen/ShopifyMonthlyForm";

export default async function ShopifyPage({
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

  const [entry, prevYearEntry] = await Promise.all([
    getShopifyMonthly(period),
    getShopifyMonthly(prevYearPeriod),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-xl">Shopify</h1>
          <p className="text-sm text-ink/50 mt-1">
            Webshop-Kennzahlen — {monthLabel(month)} {year}
          </p>
        </div>
        <PeriodPicker year={year} month={month} />
      </div>

      <ShopifyMonthlyForm
        periodStart={period}
        initial={entry}
        prevYearActual={prevYearEntry?.payout_amount ?? null}
      />
    </div>
  );
}
