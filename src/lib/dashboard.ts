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

// ---------------------------------------------------------------------------
// Jahresvergleich: laufendes Jahr gegen Vorjahr(e), Monat für Monat übereinander
// gelegt. Standard: bisheriges Jahr (Jän bis letzter abgeschlossener Monat),
// fairer Vergleich ohne den laufenden Teilmonat. Für die Ganzjahres-Ansicht
// wird der Rest des laufenden Jahres als Prognose fortgeschrieben.
// ---------------------------------------------------------------------------

export interface YearLine {
  year: number;
  // 12 Werte (Jän..Dez). null = kein Ist-Wert (Zukunft im laufenden Jahr).
  actual: (number | null)[];
  // Prognose nur fürs laufende Jahr, sonst überall null. Beginnt am letzten
  // Ist-Monat, damit die gestrichelte Linie nahtlos anschließt.
  forecast: (number | null)[];
}

export interface StreamDelta {
  key: string;
  label: string;
  current: number | null;
  previous: number | null;
  deltaPct: number | null;
}

const MONTH_LABELS_SHORT = Array.from({ length: 12 }, (_, i) =>
  format(new Date(2001, i, 1), "MMM", { locale: de }),
);

export async function buildYearComparison(referenceDate = new Date()) {
  const currentYear = referenceDate.getFullYear();
  // Letzter abgeschlossener Monat = Monat vor dem laufenden (1-basiert).
  // getMonth() ist 0-basiert: im September (=8) sind Jän..Aug abgeschlossen,
  // also lastComplete = 8.
  const lastComplete = referenceDate.getMonth(); // 0..12; 0 = Jänner läuft noch

  // Ab dem Vor-Vorjahr laden, damit ein Vorjahresvergleich auch für das
  // früheste gezeigte Jahr möglich ist.
  const fromPeriod = `${currentYear - 2}-01-01`;

  const [locationRows, shopifyRows, woltRows, foodoraRows, tgtgRows, projectRows] =
    await Promise.all([
      getLocationMonthlySeries(fromPeriod),
      getShopifySeries(fromPeriod),
      getWoltSeries(fromPeriod),
      getFoodoraSeries(fromPeriod),
      getTgtgSeries(fromPeriod),
      getProjectRevenue(),
    ]);

  const period = (year: number, month1: number) =>
    `${year}-${String(month1).padStart(2, "0")}-01`;

  function shopsFor(p: string) {
    return sum(locationRows.filter((r) => r.period_start === p).map((r) => r.revenue_net));
  }
  function shopifyFor(p: string) {
    return shopifyRows.find((r) => r.period_start === p)?.payout_amount ?? 0;
  }
  function deliveryFor(p: string) {
    const w = sum(woltRows.filter((r) => r.period_start === p).map((r) => r.payout_amount));
    const f = foodoraRows.find((r) => r.period_start === p)?.payout_total ?? 0;
    return w + f;
  }
  function tgtgFor(p: string) {
    return sum(tgtgRows.filter((r) => r.period_start === p).map((r) => r.revenue_net));
  }
  function projectsFor(p: string) {
    return sum(projectRows.filter((r) => r.period_start === p).map((r) => r.revenue_net));
  }
  function companyFor(p: string) {
    return shopsFor(p) + shopifyFor(p) + deliveryFor(p) + tgtgFor(p) + projectsFor(p);
  }

  // Ein Monat "hat Daten", wenn irgendein Kanal für diese Periode etwas liefert.
  function hasData(p: string) {
    return (
      locationRows.some((r) => r.period_start === p) ||
      shopifyRows.some((r) => r.period_start === p) ||
      woltRows.some((r) => r.period_start === p) ||
      foodoraRows.some((r) => r.period_start === p) ||
      tgtgRows.some((r) => r.period_start === p) ||
      projectRows.some((r) => r.period_start === p)
    );
  }

  // Nur Jahre zeigen, für die es Shop-Umsätze (Lunch-Locations) gibt — sonst
  // wäre die "Gesamt"-Linie irreführend (z.B. 2024 = nur Shopify).
  const shopYears = Array.from(
    new Set(locationRows.map((r) => Number(r.period_start.slice(0, 4)))),
  ).sort();
  const yearsToShow = shopYears.filter((y) => y <= currentYear);

  // Prognose-Faktor: Wie steht das laufende Jahr bisher im Verhältnis zum
  // Vorjahr? Diesen Faktor auf die Vorjahres-Restmonate anwenden.
  const prevYear = currentYear - 1;
  let ytdCurrent = 0;
  let ytdPrev = 0;
  for (let m = 1; m <= lastComplete; m++) {
    ytdCurrent += companyFor(period(currentYear, m));
    ytdPrev += companyFor(period(prevYear, m));
  }
  const forecastRatio = ytdPrev > 0 ? ytdCurrent / ytdPrev : null;

  const lines: YearLine[] = yearsToShow.map((year) => {
    const actual: (number | null)[] = [];
    const forecast: (number | null)[] = [];
    for (let m = 1; m <= 12; m++) {
      const p = period(year, m);
      const isCurrentYear = year === currentYear;
      const isComplete = !isCurrentYear || m <= lastComplete;
      actual.push(isComplete && hasData(p) ? companyFor(p) : null);
      // Prognose nur fürs laufende Jahr, ab dem letzten Ist-Monat.
      if (isCurrentYear && forecastRatio != null && m >= lastComplete) {
        forecast.push(
          m === lastComplete
            ? companyFor(period(currentYear, m)) // Anschlusspunkt = Ist
            : companyFor(period(prevYear, m)) * forecastRatio,
        );
      } else {
        forecast.push(null);
      }
    }
    return { year, actual, forecast };
  });

  // Prognose Jahresende laufendes Jahr = Ist bisher + hochgerechnete Restmonate.
  let projectedYearEnd: number | null = null;
  if (forecastRatio != null) {
    let total = ytdCurrent;
    for (let m = lastComplete + 1; m <= 12; m++) {
      total += companyFor(period(prevYear, m)) * forecastRatio;
    }
    projectedYearEnd = total;
  }
  const prevYearFullTotal = hasData(period(prevYear, 12))
    ? Array.from({ length: 12 }, (_, i) => companyFor(period(prevYear, i + 1))).reduce(
        (a, b) => a + b,
        0,
      )
    : null;

  // Pro-Kanal-Veränderung, bisheriges Jahr vs. Vorjahr (gleicher Zeitraum).
  function ytdSum(fn: (p: string) => number, year: number) {
    let t = 0;
    for (let m = 1; m <= lastComplete; m++) t += fn(period(year, m));
    return t;
  }
  const streamDefs: { key: string; label: string; fn: (p: string) => number }[] = [
    { key: "shops", label: "Shops", fn: shopsFor },
    { key: "shopify", label: "Shopify", fn: shopifyFor },
    { key: "delivery", label: "Lieferdienste", fn: deliveryFor },
    { key: "tgtg", label: "Too Good To Go", fn: tgtgFor },
    { key: "projects", label: "Projekte", fn: projectsFor },
  ];
  const perStream: StreamDelta[] = streamDefs.map((s) => {
    const current = lastComplete > 0 ? ytdSum(s.fn, currentYear) : null;
    const previous = lastComplete > 0 ? ytdSum(s.fn, prevYear) : null;
    return {
      key: s.key,
      label: s.label,
      current: current && current !== 0 ? current : current === 0 ? 0 : null,
      previous: previous && previous !== 0 ? previous : previous === 0 ? 0 : null,
      deltaPct: yoyPercent(current, previous || null),
    };
  });

  const throughLabel = lastComplete > 0 ? MONTH_LABELS_SHORT[lastComplete - 1] : null;

  return {
    monthLabels: MONTH_LABELS_SHORT,
    lastComplete, // Anzahl abgeschlossener Monate (0..12)
    currentYear,
    prevYear,
    lines,
    ytd: {
      throughLabel,
      current: lastComplete > 0 ? ytdCurrent : null,
      previous: lastComplete > 0 ? ytdPrev : null,
      deltaPct: yoyPercent(lastComplete > 0 ? ytdCurrent : null, lastComplete > 0 ? ytdPrev : null),
    },
    projectedYearEnd,
    prevYearFullTotal,
    perStream,
    hasComparison: yearsToShow.length >= 2 && lastComplete > 0,
  };
}
