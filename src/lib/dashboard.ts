import { format, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import {
  getLocationMonthlySeries,
  getShopifySeries,
  getWoltSeries,
  getFoodoraSeries,
} from "@/lib/data";
import { sum, yoyPercent } from "@/lib/calculations";
import { ACTIVE_LOCATIONS } from "@/lib/constants";

export interface MonthBucket {
  periodStart: string; // YYYY-MM-01
  label: string; // "Jän 26"
}

export function last12Months(referenceDate = new Date()): MonthBucket[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(referenceDate, 11 - i);
    const periodStart = format(d, "yyyy-MM-01");
    const label = format(d, "MMM yy", { locale: de });
    return { periodStart, label };
  });
}

export async function buildDashboardData(referenceDate = new Date()) {
  const months = last12Months(referenceDate);
  const earliestPeriod = months[0].periodStart;
  // Für Vorjahresvergleich brauchen wir zusätzlich die 12 Monate davor.
  const earliestPrevYear = format(
    subMonths(new Date(earliestPeriod), 12),
    "yyyy-MM-01",
  );

  const [locationRows, shopifyRows, woltRows, foodoraRows] = await Promise.all([
    getLocationMonthlySeries(earliestPrevYear),
    getShopifySeries(earliestPrevYear),
    getWoltSeries(earliestPrevYear),
    getFoodoraSeries(earliestPrevYear),
  ]);

  function shopsTotalFor(period: string) {
    return sum(
      locationRows
        .filter((r) => r.period_start === period)
        .map((r) => r.revenue_net),
    );
  }
  function discountsTotalFor(period: string) {
    return sum(
      locationRows
        .filter((r) => r.period_start === period)
        .map((r) => r.discounts_total),
    );
  }
  function shopifyTotalFor(period: string) {
    const row = shopifyRows.find((r) => r.period_start === period);
    return row?.payout_amount ?? null;
  }
  function woltTotalFor(period: string) {
    const rows = woltRows.filter((r) => r.period_start === period);
    if (rows.length === 0) return null;
    return sum(rows.map((r) => r.payout_amount));
  }
  function foodoraTotalFor(period: string) {
    const row = foodoraRows.find((r) => r.period_start === period);
    return row?.payout_total ?? null;
  }
  function deliveryTotalFor(period: string) {
    const wolt = woltTotalFor(period);
    const foodora = foodoraTotalFor(period);
    if (wolt == null && foodora == null) return null;
    return (wolt ?? 0) + (foodora ?? 0);
  }
  function companyTotalFor(period: string) {
    return (
      shopsTotalFor(period) +
      (shopifyTotalFor(period) ?? 0) +
      (deliveryTotalFor(period) ?? 0)
    );
  }

  const revenueTrend = months.map((m) => ({
    label: m.label,
    value: companyTotalFor(m.periodStart),
  }));

  const streamComparison = months.map((m) => ({
    label: m.label,
    Shops: shopsTotalFor(m.periodStart),
    Shopify: shopifyTotalFor(m.periodStart) ?? 0,
    Lieferdienste: deliveryTotalFor(m.periodStart) ?? 0,
  }));

  const currentPeriod = months[months.length - 1].periodStart;
  const prevMonthPeriod = months[months.length - 2]?.periodStart;
  const currentYearPrevPeriod = format(
    subMonths(new Date(currentPeriod), 12),
    "yyyy-MM-01",
  );

  const locationBar = ACTIVE_LOCATIONS.map((loc) => ({
    label: loc.shortName,
    value:
      locationRows.find(
        (r) => r.location_code === loc.code && r.period_start === currentPeriod,
      )?.revenue_net ?? 0,
  })).filter((d) => d.value > 0);

  const currentTotal = companyTotalFor(currentPeriod);
  const prevYearTotal = companyTotalFor(currentYearPrevPeriod);
  const currentShopify = shopifyTotalFor(currentPeriod);
  const prevYearShopify = shopifyTotalFor(currentYearPrevPeriod);
  const currentDelivery = deliveryTotalFor(currentPeriod);
  const prevYearDelivery = deliveryTotalFor(currentYearPrevPeriod);
  const currentDiscounts = discountsTotalFor(currentPeriod);
  const prevMonthTotal = prevMonthPeriod ? companyTotalFor(prevMonthPeriod) : null;

  return {
    months,
    revenueTrend,
    streamComparison,
    locationBar,
    kpis: {
      currentTotal,
      totalYoy: yoyPercent(currentTotal, prevYearTotal || null),
      momChange: yoyPercent(currentTotal, prevMonthTotal),
      currentShops: shopsTotalFor(currentPeriod),
      currentShopify,
      shopifyYoy: yoyPercent(currentShopify, prevYearShopify),
      currentDelivery,
      deliveryYoy: yoyPercent(currentDelivery, prevYearDelivery),
      currentDiscounts,
    },
  };
}
