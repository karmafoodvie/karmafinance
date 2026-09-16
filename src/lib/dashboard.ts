import { format, subMonths } from "date-fns";
import { de } from "date-fns/locale";
import {
  getLocationMonthlySeries,
  getShopifySeries,
  getWoltSeries,
  getFoodoraPayoutSeries,
  getTgtgSeries,
  getProjectRevenue,
} from "@/lib/data";
import { getB2BMonthlyTotals } from "@/lib/b2b";
import { sum, yoyPercent } from "@/lib/calculations";
import { ACTIVE_LOCATIONS, TGTG_LOCATIONS } from "@/lib/constants";
import {
  compareYoy,
  monthsInRange,
  type MonthBucket,
  type YoyResult,
} from "@/lib/vergleich";

// Zeitraum-Helfer leben jetzt zentral in @/lib/vergleich — hier nur
// weitergereicht, damit bestehende Importe weiter funktionieren.
export { monthsInRange };
export type { MonthBucket };

export interface DateRange {
  from: string; // YYYY-MM-01
  to: string; // YYYY-MM-01
}

export function last12Months(referenceDate = new Date()): MonthBucket[] {
  const to = format(referenceDate, "yyyy-MM-01");
  const from = format(subMonths(referenceDate, 11), "yyyy-MM-01");
  return monthsInRange(from, to);
}

export async function buildDashboardData(range?: DateRange) {
  const months = range ? monthsInRange(range.from, range.to) : last12Months();
  const earliestPeriod = months[0].periodStart;
  const latestPeriod = months[months.length - 1].periodStart;
  // Für Vorjahresvergleich brauchen wir zusätzlich die 12 Monate davor.
  const earliestPrevYear = format(
    subMonths(new Date(earliestPeriod), 12),
    "yyyy-MM-01",
  );

  const [locationRows, shopifyRows, woltRows, foodoraRows, tgtgRows, projectRows, b2bTotals] =
    await Promise.all([
      getLocationMonthlySeries(earliestPrevYear),
      getShopifySeries(earliestPrevYear),
      getWoltSeries(earliestPrevYear),
      // ACHTUNG: Foodora-Umsatz steht in foodora_location_payout, NICHT in
      // foodora_monthly — die Tabelle ist leer. Vorher wurde foodora_monthly
      // gelesen, dadurch lief Foodora überall mit 0 € mit.
      getFoodoraPayoutSeries(earliestPrevYear),
      getTgtgSeries(earliestPrevYear),
      getProjectRevenue(),
      getB2BMonthlyTotals(earliestPrevYear, latestPeriod),
    ]);

  // ── Werte je Monat ────────────────────────────────────────────────────────
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
    const rows = foodoraRows.filter((r) => r.period_start === period);
    if (rows.length === 0) return null;
    return sum(rows.map((r) => r.payout_amount));
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
  function b2bTotalFor(period: string) {
    return b2bTotals[period]?.b2b ?? null;
  }
  function cateringTotalFor(period: string) {
    return b2bTotals[period]?.catering ?? null;
  }
  // Gesamtumsatz = ALLE Ströme, inklusive B2B und Catering. Diese Definition
  // gilt in der ganzen App (Kachel, Monatschart und Jahresvergleich) — vorher
  // rechnete der Jahresvergleich ohne B2B/Catering und zeigte dadurch eine
  // andere Veränderung als die Kachel darüber.
  function companyTotalFor(period: string) {
    return (
      shopsTotalFor(period) +
      (shopifyTotalFor(period) ?? 0) +
      (deliveryTotalFor(period) ?? 0) +
      (tgtgNetTotalFor(period) ?? 0) +
      (projectTotalFor(period) ?? 0) +
      (b2bTotalFor(period) ?? 0) +
      (cateringTotalFor(period) ?? 0)
    );
  }

  // ── Wann ist ein Monat überhaupt vergleichbar? ────────────────────────────
  // Pro Strom: liegen für diesen Monat Daten vor? (Fehlender Monat ≠ 0 €.)
  const hasShops = (p: string) => locationRows.some((r) => r.period_start === p);
  const hasShopify = (p: string) => shopifyRows.some((r) => r.period_start === p);
  const hasDelivery = (p: string) => deliveryTotalFor(p) != null;
  const hasTgtg = (p: string) => tgtgRowsFor(p).length > 0;
  const hasB2B = (p: string) => b2bTotals[p] != null;
  // Für den GESAMTUMSATZ gilt: ein Monat ist nur vergleichbar, wenn für die
  // Lunch-Locations Umsatz erfasst ist. Die Standorte gab es auch vor der
  // ersten erfassten Periode — ohne sie wäre ein Gesamtvergleich Unsinn
  // (Okt–Dez 2024 hätte sonst als "Vorjahr" nur Shopify + B2B + Catering).
  const hasCompany = hasShops;

  const revenueTrend = months.map((m) => ({
    label: m.label,
    value: companyTotalFor(m.periodStart),
  }));

  const streamComparison = months.map((m) => {
    const prevYearPeriod = format(subMonths(new Date(m.periodStart), 12), "yyyy-MM-01");
    return {
      label: m.label,
      Shops: shopsTotalFor(m.periodStart),
      Shopify: shopifyTotalFor(m.periodStart) ?? 0,
      Lieferdienste: deliveryTotalFor(m.periodStart) ?? 0,
      TGTG: tgtgNetTotalFor(m.periodStart) ?? 0,
      Projekte: projectTotalFor(m.periodStart) ?? 0,
      B2B: b2bTotalFor(m.periodStart) ?? 0,
      Catering: cateringTotalFor(m.periodStart) ?? 0,
      // Vorjahreslinie nur dort, wo der Vorjahresmonat auch wirklich
      // vergleichbar ist — sonst zeigt sie einen Bruchteil des echten
      // Vorjahres und suggeriert ein Wachstum, das es nicht gab.
      VorjahrGesamt: hasCompany(prevYearPeriod) ? companyTotalFor(prevYearPeriod) : null,
    };
  });

  // Kennzahlen beziehen sich auf den GANZEN gewählten Zeitraum (Summe).
  // Der Vorjahresvergleich dagegen läuft über @/lib/vergleich und nimmt nur
  // die Monate, die auf beiden Seiten erfasst und abgeschlossen sind.
  const periods = months.map((m) => m.periodStart);

  function rangeSum(fn: (p: string) => number | null, ps: string[]): number | null {
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

  const totalYoy: YoyResult = compareYoy(months, companyTotalFor, { hasData: hasCompany });
  const shopsYoy = compareYoy(months, shopsTotalFor, { hasData: hasShops });
  const shopifyYoy = compareYoy(months, shopifyTotalFor, { hasData: hasShopify });
  const deliveryYoy = compareYoy(months, deliveryTotalFor, { hasData: hasDelivery });
  const tgtgYoy = compareYoy(months, tgtgNetTotalFor, { hasData: hasTgtg });
  const b2bYoy = compareYoy(months, b2bTotalFor, { hasData: hasB2B });
  const cateringYoy = compareYoy(months, cateringTotalFor, { hasData: hasB2B });

  return {
    months,
    revenueTrend,
    streamComparison,
    locationBar,
    kpis: {
      currentTotal: sum(periods.map((p) => companyTotalFor(p))),
      totalYoy,
      currentShops: sum(periods.map((p) => shopsTotalFor(p))),
      shopsYoy,
      currentShopify: rangeSum(shopifyTotalFor, periods),
      shopifyYoy,
      currentDelivery: rangeSum(deliveryTotalFor, periods),
      deliveryYoy,
      currentB2B: rangeSum(b2bTotalFor, periods) ?? 0,
      b2bYoy,
      currentCatering: rangeSum(cateringTotalFor, periods) ?? 0,
      cateringYoy,
      currentDiscounts: sum(periods.map((p) => discountsTotalFor(p))),
      currentTgtgNet: rangeSum(tgtgNetTotalFor, periods),
      currentTgtgGross: rangeSum(tgtgGrossTotalFor, periods),
      currentTgtgFee: rangeSum(tgtgFeeTotalFor, periods),
      currentTgtgMeals: rangeSum(tgtgMealsTotalFor, periods),
      tgtgYoy,
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
  const hasTgtg = (p: string) => rowsFor(p).length > 0;

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

  // Kennzahlen = Summe über den GEWÄHLTEN ZEITRAUM. Vorher war es nur der
  // letzte Monat des Zeitraums — dieselbe Zeitraumauswahl hat auf dieser Seite
  // also etwas anderes bedeutet als auf Dashboard, B2B und Lieferdiensten,
  // und die TGTG-Kachel im Dashboard zeigte eine andere Zahl als diese Seite.
  const periods = months.map((m) => m.periodStart);
  function rangeSum(fn: (p: string) => number | null): number | null {
    let any = false;
    let total = 0;
    for (const p of periods) {
      const v = fn(p);
      if (v != null) {
        any = true;
        total += v;
      }
    }
    return any ? total : null;
  }

  const hasAnyData = tgtgRows.length > 0;

  return {
    months,
    netTrend,
    mealsTrend,
    locationTrend,
    locationKeys,
    hasAnyData,
    kpis: {
      currentNet: rangeSum(netTotalFor),
      netYoy: compareYoy(months, netTotalFor, { hasData: hasTgtg }),
      currentGross: rangeSum(grossTotalFor),
      currentFee: rangeSum(feeTotalFor),
      currentMeals: rangeSum(mealsTotalFor),
      mealsYoy: compareYoy(months, mealsTotalFor, { hasData: hasTgtg }),
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
  /** Vollständiges Vergleichsergebnis inkl. Vergleichsfenster */
  yoy: YoyResult;
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

  const [locationRows, shopifyRows, woltRows, foodoraRows, tgtgRows, projectRows, b2bTotals] =
    await Promise.all([
      getLocationMonthlySeries(fromPeriod),
      getShopifySeries(fromPeriod),
      getWoltSeries(fromPeriod),
      getFoodoraPayoutSeries(fromPeriod),
      getTgtgSeries(fromPeriod),
      getProjectRevenue(),
      getB2BMonthlyTotals(fromPeriod, `${currentYear}-12-01`),
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
    const f = sum(foodoraRows.filter((r) => r.period_start === p).map((r) => r.payout_amount));
    return w + f;
  }
  function b2bFor(p: string) {
    return b2bTotals[p]?.b2b ?? 0;
  }
  function cateringFor(p: string) {
    return b2bTotals[p]?.catering ?? 0;
  }
  function tgtgFor(p: string) {
    return sum(tgtgRows.filter((r) => r.period_start === p).map((r) => r.revenue_net));
  }
  function projectsFor(p: string) {
    return sum(projectRows.filter((r) => r.period_start === p).map((r) => r.revenue_net));
  }
  // Gleiche Definition wie in buildDashboardData: Gesamt = alle Ströme
  // inklusive B2B und Catering.
  function companyFor(p: string) {
    return (
      shopsFor(p) +
      shopifyFor(p) +
      deliveryFor(p) +
      tgtgFor(p) +
      projectsFor(p) +
      b2bFor(p) +
      cateringFor(p)
    );
  }

  // Datenlage je Strom — fehlender Monat heißt "nicht erfasst", nicht "0 €".
  const hasShopsData = (p: string) => locationRows.some((r) => r.period_start === p);
  const hasShopifyData = (p: string) => shopifyRows.some((r) => r.period_start === p);
  const hasDeliveryData = (p: string) =>
    woltRows.some((r) => r.period_start === p) || foodoraRows.some((r) => r.period_start === p);
  const hasTgtgData = (p: string) => tgtgRows.some((r) => r.period_start === p);
  const hasProjectData = (p: string) => projectRows.some((r) => r.period_start === p);
  const hasB2BData = (p: string) => b2bTotals[p] != null;

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

  // Die abgeschlossenen Monate des laufenden Jahres als Monatsraster — Basis
  // für alle Vergleiche hier. Sie laufen über dieselbe Funktion wie die
  // Kacheln oben, damit die Prozentwerte zusammenpassen. Vorher wurde hier
  // stumpf Jän–Aug gegen Jän–Aug gerechnet, auch wenn es einen Kanal im
  // Vorjahr noch gar nicht gab — daher Werte wie "Lieferdienste +1.645 %".
  const ytdMonths =
    lastComplete > 0
      ? monthsInRange(period(currentYear, 1), period(currentYear, lastComplete))
      : [];

  const streamDefs: {
    key: string;
    label: string;
    fn: (p: string) => number;
    hasData: (p: string) => boolean;
  }[] = [
    { key: "shops", label: "Shops", fn: shopsFor, hasData: hasShopsData },
    { key: "shopify", label: "Shopify", fn: shopifyFor, hasData: hasShopifyData },
    { key: "delivery", label: "Lieferdienste", fn: deliveryFor, hasData: hasDeliveryData },
    { key: "b2b", label: "B2B", fn: b2bFor, hasData: hasB2BData },
    { key: "catering", label: "Catering", fn: cateringFor, hasData: hasB2BData },
    { key: "tgtg", label: "Too Good To Go", fn: tgtgFor, hasData: hasTgtgData },
    { key: "projects", label: "Projekte", fn: projectsFor, hasData: hasProjectData },
  ];
  const perStream: StreamDelta[] = streamDefs.map((s) => {
    const current = lastComplete > 0 ? ytdSum(s.fn, currentYear) : null;
    const previous = lastComplete > 0 ? ytdSum(s.fn, prevYear) : null;
    return {
      key: s.key,
      label: s.label,
      current,
      previous,
      yoy: compareYoy(ytdMonths, s.fn, { hasData: s.hasData }),
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
      yoy: compareYoy(ytdMonths, companyFor, { hasData: hasShopsData }),
    },
    projectedYearEnd,
    prevYearFullTotal,
    perStream,
    hasComparison: yearsToShow.length >= 2 && lastComplete > 0,
  };
}
