import { format, subMonths, addMonths } from "date-fns";
import { de } from "date-fns/locale";
import {
  getLocationMonthlySeries,
  getShopifySeries,
  getWoltSeries,
  getFoodoraSeries,
  getTgtgSeries,
} from "@/lib/data";
import { sum, yoyPercent } from "@/lib/calculations";
import { ACTIVE_LOCATIONS } from "@/lib/constants";

export interface MonthBucket {
  periodStart: string; // YYYY-MM-01
  label: string; // "Jän 26"
}

export interface DateRange {
  from: string; // YYYY-MM-01
  to: string; // YYYY-MM-01
}

export function last12Months(referenceDate = new Date()): MonthBucket[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(referenceDate, 11 - i);
    const periodStart = format(d, "yyyy-MM-01");
    const label = format(d, "MMM yy", { locale: de });
    return { periodStart, label };
  });
}

// Baut alle Monats-"Buckets" zwischen from und to (beide inklusive). Wird
// für den benutzerdefinierten Zeitraum im Dashboard verwendet — statt der
// fix eingebauten "letzten 12 Monate".
export function monthsInRange(fromPeriod: string, toPeriod: string): MonthBucket[] {
  const start = new Date(fromPeriod);
  const end = new Date(toPeriod);
  const result: MonthBucket[] = [];
  let cursor = start;
  let guard = 0;
  // Sicherheitslimit (50 Jahre), falls von/bis vertauscht o.ä. hereinkommen.
  while (cursor <= end && guard < 600) {
    result.push({
      periodStart: format(cursor, "yyyy-MM-01"),
      label: format(cursor, "MMM yy", { locale: de }),
    });
    cursor = addMonths(cursor, 1);
    guard++;
  }
  return result.length > 0 ? result : last12Months(end);
}

export async function buildDashboardData(range?: DateRange) {
  const months = range ? monthsInRange(range.from, range.to) : last12Months();
  const earliestPeriod = months[0].periodStart;
  // Für Vorjahresvergleich brauchen wir zusätzlich die 12 Monate davor.
  const earliestPrevYear = format(
    subMonths(new Date(earliestPeriod), 12),
    "yyyy-MM-01",
  );

  const [locationRows, shopifyRows, woltRows, foodoraRows, tgtgRows] = await Promise.all([
    getLocationMonthlySeries(earliestPrevYear),
    getShopifySeries(earliestPrevYear),
    getWoltSeries(earliestPrevYear),
    getFoodoraSeries(earliestPrevYear),
    getTgtgSeries(earliestPrevYear),
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
  // TGTG: Netto = tatsächliche Auszahlung (Brutto minus TGTG-Reservierungsgebühr),
  // das zählt für den Gesamtumsatz. Brutto (Verkaufswert vor Gebühr) wird separat
  // mitgeführt, weil Gurl beides sehen will.
  function tgtgRowsFor(period: string) {
    return tgtgRows.filter((r) => r.period_start === period);
  }
  function tgtgNetTotalFor(period: string) {
    const rows = tgtgRowsFor(period);
    if (rows.length === 0) return null;
    return sum(rows.map((r) => r.revenue_net));
  }
  function tgtgGrossTotalFor(period: string) {
    const rows = tgtgRowsFor(period);
    if (rows.length === 0) return null;
    return sum(rows.map((r) => r.revenue_gross));
  }
  function tgtgFeeTotalFor(period: string) {
    const rows = tgtgRowsFor(period);
    if (rows.length === 0) return null;
    return sum(rows.map((r) => r.fee_amount));
  }
  function tgtgMealsTotalFor(period: string) {
    const rows = tgtgRowsFor(period);
    if (rows.length === 0) return null;
    return sum(rows.map((r) => r.meals_saved));
  }
  function companyTotalFor(period: string) {
    return (
      shopsTotalFor(period) +
      (shopifyTotalFor(period) ?? 0) +
      (deliveryTotalFor(period) ?? 0) +
      (tgtgNetTotalFor(period) ?? 0)
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
    TGTG: tgtgNetTotalFor(m.periodStart) ?? 0,
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
  const currentTgtgNet = tgtgNetTotalFor(currentPeriod);
  const currentTgtgGross = tgtgGrossTotalFor(currentPeriod);
  const currentTgtgFee = tgtgFeeTotalFor(currentPeriod);
  const currentTgtgMeals = tgtgMealsTotalFor(currentPeriod);
  const prevYearTgtgNet = tgtgNetTotalFor(currentYearPrevPeriod);

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
      currentTgtgNet,
      currentTgtgGross,
      currentTgtgFee,
      currentTgtgMeals,
      tgtgYoy: yoyPercent(currentTgtgNet, prevYearTgtgNet),
    },
  };
}
