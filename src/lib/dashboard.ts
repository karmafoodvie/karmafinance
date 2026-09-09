import { format, subMonths, addMonths } from "date-fns";
import { de } from "date-fns/locale";
import {
  getLocationMonthlySeries,
  getShopifySeries,
  getWoltSeries,
  getFoodoraSeries,
  getTgtgSeries,
  getProjectRevenue,
} from "@/lib/data";
import { sum, yoyPercent } from "@/lib/calculations";
import { ACTIVE_LOCATIONS, TGTG_LOCATIONS } from "@/lib/constants";

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

  const [locationRows, shopifyRows, woltRows, foodoraRows, tgtgRows, projectRows] = await Promise.all([
    getLocationMonthlySeries(earliestPrevYear),
    getShopifySeries(earliestPrevYear),
    getWoltSeries(earliestPrevYear),
    getFoodoraSeries(earliestPrevYear),
    getTgtgSeries(earliestPrevYear),
    getProjectRevenue(),
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
  // Projekte & Pop-ups: freie Projektnamen, hier für den Gesamtumsatz nur
  // pro Monat aufsummiert (welches Projekt es war, ist auf der eigenen
  // Projekte-Seite nachzusehen).
  function projectTotalFor(period: string) {
    const rows = projectRows.filter((r) => r.period_start === period);
    if (rows.length === 0) return null;
    return sum(rows.map((r) => r.revenue_net));
  }
  function companyTotalFor(period: string) {
    return (
      shopsTotalFor(period) +
      (shopifyTotalFor(period) ?? 0) +
      (deliveryTotalFor(period) ?? 0) +
      (tgtgNetTotalFor(period) ?? 0) +
      (projectTotalFor(period) ?? 0)
    );
  }

  const revenueTrend = months.map((m) => ({
    label: m.label,
    value: companyTotalFor(m.periodStart),
  }));

  const streamComparison = months.map((m) => {
    const prevYearPeriod = format(subMonths(new Date(m.periodStart), 12), "yyyy-MM-01");
    // Vorjahr nur zeigen, wenn's für den Monat überhaupt irgendwo Daten gibt
    // — sonst ergäbe "Gesamt 0" eine irreführende Nulllinie im Chart.
    const hasPrevYearData =
      locationRows.some((r) => r.period_start === prevYearPeriod) ||
      shopifyTotalFor(prevYearPeriod) != null ||
      deliveryTotalFor(prevYearPeriod) != null ||
      tgtgNetTotalFor(prevYearPeriod) != null ||
      projectTotalFor(prevYearPeriod) != null;
    return {
      label: m.label,
      Shops: shopsTotalFor(m.periodStart),
      Shopify: shopifyTotalFor(m.periodStart) ?? 0,
      Lieferdienste: deliveryTotalFor(m.periodStart) ?? 0,
      TGTG: tgtgNetTotalFor(m.periodStart) ?? 0,
      Projekte: projectTotalFor(m.periodStart) ?? 0,
      VorjahrGesamt: hasPrevYearData ? companyTotalFor(prevYearPeriod) : null,
    };
  });

  // Kennzahlen beziehen sich auf den GANZEN gewählten Zeitraum (Summe),
  // nicht nur auf den letzten Monat. Der letzte Monat kann ein Teilmonat
  // sein (z.B. laufender September) und ergäbe sonst eine irreführend
  // niedrige "Umsatz gesamt"-Zahl.
  const periods = months.map((m) => m.periodStart);
  const prevYearPeriods = periods.map((p) =>
    format(subMonths(new Date(p), 12), "yyyy-MM-01"),
  );

  // Summe über die Perioden; null, wenn für keinen Monat Daten vorliegen
  // (dann zeigt die Kachel "–" bzw. "kein Vorjahr").
  function rangeSum(
    fn: (p: string) => number | null,
    ps: string[],
  ): number | null {
    let any = false;
    let total = 0;
    for (const p of ps) {
      const v = fn(p);
      if (v != null) {
        any = true;
        total += v;
      }
    }
    return any ? total : null;
  }

  // Standorte: Umsatz je Standort über den ganzen Zeitraum aufsummiert.
  const periodSet = new Set(periods);
  const locationBar = ACTIVE_LOCATIONS.map((loc) => ({
    label: loc.shortName,
    value: sum(
      locationRows
        .filter((r) => r.location_code === loc.code && periodSet.has(r.period_start))
        .map((r) => r.revenue_net),
    ),
  })).filter((d) => d.value > 0);

  const rangeTotal = sum(periods.map((p) => companyTotalFor(p)));
  const rangeTotalPrev = sum(prevYearPeriods.map((p) => companyTotalFor(p)));
  const rangeShops = sum(periods.map((p) => shopsTotalFor(p)));
  const rangeShopify = rangeSum(shopifyTotalFor, periods);
  const rangeShopifyPrev = rangeSum(shopifyTotalFor, prevYearPeriods);
  const rangeDelivery = rangeSum(deliveryTotalFor, periods);
  const rangeDeliveryPrev = rangeSum(deliveryTotalFor, prevYearPeriods);
  const rangeDiscounts = sum(periods.map((p) => discountsTotalFor(p)));
  const rangeTgtgNet = rangeSum(tgtgNetTotalFor, periods);
  const rangeTgtgNetPrev = rangeSum(tgtgNetTotalFor, prevYearPeriods);
  const rangeTgtgGross = rangeSum(tgtgGrossTotalFor, periods);
  const rangeTgtgFee = rangeSum(tgtgFeeTotalFor, periods);
  const rangeTgtgMeals = rangeSum(tgtgMealsTotalFor, periods);

  return {
    months,
    revenueTrend,
    streamComparison,
    locationBar,
    kpis: {
      currentTotal: rangeTotal,
      totalYoy: yoyPercent(rangeTotal, rangeTotalPrev || null),
      currentShops: rangeShops,
      currentShopify: rangeShopify,
      shopifyYoy: yoyPercent(rangeShopify, rangeShopifyPrev),
      currentDelivery: rangeDelivery,
      deliveryYoy: yoyPercent(rangeDelivery, rangeDeliveryPrev),
      currentDiscounts: rangeDiscounts,
      currentTgtgNet: rangeTgtgNet,
      currentTgtgGross: rangeTgtgGross,
      currentTgtgFee: rangeTgtgFee,
      currentTgtgMeals: rangeTgtgMeals,
      tgtgYoy: yoyPercent(rangeTgtgNet, rangeTgtgNetPrev),
    },
  };
}

// Eigene Auswertung nur für Too Good To Go — Entwicklung über Zeit, pro
// Standort und mit Sackerl-Anzahl. Getrennt von buildDashboardData, weil
// TGTG eine völlig eigene Sache ist (Lebensmittelrettung, nicht Umsatz-
// Kanal wie Wolt/Foodora) und ihre eigene Seite mit eigenem Zeitraum hat.
export async function buildTgtgDashboardData(range?: DateRange) {
  const months = range ? monthsInRange(range.from, range.to) : last12Months();
  const earliestPeriod = months[0].periodStart;
  const earliestPrevYear = format(
    subMonths(new Date(earliestPeriod), 12),
    "yyyy-MM-01",
  );

  const tgtgRows = await getTgtgSeries(earliestPrevYear);

  function rowsFor(period: string) {
    return tgtgRows.filter((r) => r.period_start === period);
  }
  function netTotalFor(period: string) {
    const rows = rowsFor(period);
    if (rows.length === 0) return null;
    return sum(rows.map((r) => r.revenue_net));
  }
  function grossTotalFor(period: string) {
    const rows = rowsFor(period);
    if (rows.length === 0) return null;
    return sum(rows.map((r) => r.revenue_gross));
  }
  function feeTotalFor(period: string) {
    const rows = rowsFor(period);
    if (rows.length === 0) return null;
    return sum(rows.map((r) => r.fee_amount));
  }
  function mealsTotalFor(period: string) {
    const rows = rowsFor(period);
    if (rows.length === 0) return null;
    return sum(rows.map((r) => r.meals_saved));
  }

  const netTrend = months.map((m) => ({
    label: m.label,
    value: netTotalFor(m.periodStart) ?? 0,
  }));

  const mealsTrend = months.map((m) => ({
    label: m.label,
    value: mealsTotalFor(m.periodStart) ?? 0,
  }));

  const locationKeys = TGTG_LOCATIONS.map((l) => l.shortName);

  const locationTrend = months.map((m) => {
    const point: { label: string; [key: string]: string | number } = {
      label: m.label,
    };
    for (const loc of TGTG_LOCATIONS) {
      const row = tgtgRows.find(
        (r) => r.location_code === loc.code && r.period_start === m.periodStart,
      );
      point[loc.shortName] = row?.revenue_net ?? 0;
    }
    return point;
  });

  const currentPeriod = months[months.length - 1].periodStart;
  const currentYearPrevPeriod = format(
    subMonths(new Date(currentPeriod), 12),
    "yyyy-MM-01",
  );

  const currentNet = netTotalFor(currentPeriod);
  const currentGross = grossTotalFor(currentPeriod);
  const currentFee = feeTotalFor(currentPeriod);
  const currentMeals = mealsTotalFor(currentPeriod);
  const prevYearNet = netTotalFor(currentYearPrevPeriod);
  const prevYearMeals = mealsTotalFor(currentYearPrevPeriod);

  const hasAnyData = tgtgRows.length > 0;

  return {
    months,
    netTrend,
    mealsTrend,
    locationTrend,
    locationKeys,
    hasAnyData,
    kpis: {
      currentNet,
      netYoy: yoyPercent(currentNet, prevYearNet),
      currentGross,
      currentFee,
      currentMeals,
      mealsYoy: yoyPercent(currentMeals, prevYearMeals),
    },
  };
}
