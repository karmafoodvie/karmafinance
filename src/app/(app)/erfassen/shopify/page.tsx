import Link from "next/link";
import { subMonths } from "date-fns";
import { periodStart, monthLabel, QUICK_LINKS } from "@/lib/constants";
import { getShopifyMonthly } from "@/lib/data";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { ShopifyMonthlyForm } from "@/components/erfassen/ShopifyMonthlyForm";
import { QuickLinks } from "@/components/ui/QuickLinks";
import { ShopifyAnalytics } from "@/components/ShopifyAnalytics";
import { FinanceChatWidget } from "@/components/FinanceChatWidget";

const links = QUICK_LINKS.filter((l) => l.key === "shopify");

const FIRST_YEAR = 2022; // Shopify-Daten ab April 2022

export default async function ShopifyPage({
  searchParams,
}: {
  searchParams: Promise<{
    fromYear?: string;
    fromMonth?: string;
    toYear?: string;
    toMonth?: string;
  }>;
}) {
  const params = await searchParams;
  const now = new Date();
  // Standard: die letzten 12 Monate (Jahresübersicht), über den Zeitraum-Picker
  // oder die Jahres-Buttons änderbar. Von = Bis zeigt einen Einzelmonat mit
  // Tagesverlauf.
  const defaultFrom = subMonths(now, 11);

  const fromYear = Number(params.fromYear) || defaultFrom.getFullYear();
  const fromMonth = Number(params.fromMonth) || defaultFrom.getMonth() + 1;
  const toYear = Number(params.toYear) || now.getFullYear();
  const toMonth = Number(params.toMonth) || now.getMonth() + 1;

  let fromPeriod = periodStart(fromYear, fromMonth);
  let toPeriod = periodStart(toYear, toMonth);
  if (fromPeriod > toPeriod) {
    [fromPeriod, toPeriod] = [toPeriod, fromPeriod];
  }

  const isRange = fromPeriod !== toPeriod;
  const [toY, toM] = toPeriod.split("-").map(Number);
  const [fromY, fromM] = fromPeriod.split("-").map(Number);

  // Manuelles Nachtragen bezieht sich immer auf einen Monat: bei einem
  // Zeitraum auf den letzten Monat davon.
  const [entry, prevYearEntry] = await Promise.all([
    getShopifyMonthly(toPeriod),
    getShopifyMonthly(periodStart(toY - 1, toM)),
  ]);

  const years: number[] = [];
  for (let y = now.getFullYear(); y >= FIRST_YEAR; y--) years.push(y);

  const subtitle = isRange
    ? `Webshop-Kennzahlen — ${monthLabel(fromM)} ${fromY} bis ${monthLabel(toM)} ${toY}`
    : `Webshop-Kennzahlen — ${monthLabel(toM)} ${toY}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="font-heading text-xl">Shopify</h1>
          <p className="text-sm text-ink/50 mt-1">{subtitle}</p>
        </div>
        <DateRangePicker
          fromYear={fromY}
          fromMonth={fromM}
          toYear={toY}
          toMonth={toM}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-6">
        <span className="text-xs text-ink/40 mr-1">Jahresübersicht</span>
        {years.map((y) => (
          <Link
            key={y}
            href={`/erfassen/shopify?fromYear=${y}&fromMonth=1&toYear=${y}&toMonth=12`}
            className="rounded-full border border-ink/15 px-2.5 py-1 text-xs text-ink/60 hover:border-ink/30 hover:text-ink transition-colors"
          >
            {y}
          </Link>
        ))}
      </div>

      <div className="mb-6">
        <QuickLinks links={links} />
      </div>

      <ShopifyAnalytics
        fromPeriod={fromPeriod}
        toPeriod={toPeriod}
        manualEntry={
          <div>
            {isRange && (
              <p className="text-sm text-ink/50 mb-3">
                Nachtragen bezieht sich auf {monthLabel(toM)} {toY} (letzter Monat des Zeitraums).
              </p>
            )}
            <ShopifyMonthlyForm
              periodStart={toPeriod}
              initial={entry}
              prevYearActual={prevYearEntry?.payout_amount ?? null}
            />
          </div>
        }
      />
      <FinanceChatWidget page="shopify" periodStart={toPeriod} />
    </div>
  );
}
