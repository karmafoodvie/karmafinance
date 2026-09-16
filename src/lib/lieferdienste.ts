// Lieferdienste = Wolt + Foodora. Die Zahlen laufen automatisiert aus den
// Auszahlungsmails ein — es gibt hier bewusst KEIN manuelles Erfassungsformular
// mehr. Diese Datei baut nur noch die Auswertung: Zeitraum, Vorjahresvergleich,
// Aufteilung nach Kanal und Standort.
//
// DATENQUELLE FOODORA: foodora_location_payout (Auszahlung je Standort).
// Die Tabelle foodora_monthly ist leer — sie war für Brutto/Provision/
// Bestellanzahl gedacht und wurde nie befüllt. Wer Foodora-Umsatz von dort
// liest, bekommt überall 0 € (genau das war vorher im Dashboard der Fall).
// Bestellanzahlen gibt es daher aktuell für keinen der beiden Lieferdienste:
// Wolt liefert sie gar nicht, Foodora nur in foodora_monthly — und die ist leer.
//
// Zeitraum- und Vorjahreslogik kommt zentral aus @/lib/vergleich.

import {
  getWoltSeries,
  getFoodoraPayoutSeries,
} from "@/lib/data";
import { ACTIVE_LOCATIONS, type LocationCode } from "@/lib/constants";
import { sum } from "@/lib/calculations";
import {
  compareYoy,
  monthsInRange,
  shiftYear,
  type MonthBucket,
  type YoyResult,
} from "@/lib/vergleich";

export { monthsInRange as monthsBetween, shiftYear };
export type { MonthBucket };

export interface LieferdiensteChartPoint {
  label: string;
  Wolt: number;
  Foodora: number;
  VorjahrGesamt: number | null;
}

export interface LocationTotal {
  code: LocationCode;
  name: string;
  wolt: number;
  foodora: number;
  total: number;
  prevTotal: number | null;
  yoy: YoyResult;
}

export interface LieferdiensteView {
  months: MonthBucket[];
  chart: LieferdiensteChartPoint[];
  locations: LocationTotal[];
  kpis: {
    total: number;
    yoy: YoyResult;
    woltTotal: number;
    woltYoy: YoyResult;
    foodoraTotal: number;
    foodoraYoy: YoyResult;
    hasPrevYear: boolean;
  };
}

/**
 * Baut die komplette /lieferdienste-Ansicht für einen Zeitraum, inklusive
 * Vorjahresvergleich nach den zentralen Regeln aus @/lib/vergleich.
 */
export async function buildLieferdiensteView(range: {
  from: string;
  to: string;
}): Promise<LieferdiensteView> {
  const months = monthsInRange(range.from, range.to);
  const prevFrom = shiftYear(range.from, -1);

  const [woltRows, foodoraRows] = await Promise.all([
    getWoltSeries(prevFrom),
    getFoodoraPayoutSeries(prevFrom),
  ]);

  const woltFor = (period: string) =>
    sum(woltRows.filter((r) => r.period_start === period).map((r) => r.payout_amount));
  const foodoraFor = (period: string) =>
    sum(foodoraRows.filter((r) => r.period_start === period).map((r) => r.payout_amount));
  const gesamtFor = (period: string) => woltFor(period) + foodoraFor(period);

  const woltForLocation = (code: string, period: string) =>
    sum(
      woltRows
        .filter((r) => r.location_code === code && r.period_start === period)
        .map((r) => r.payout_amount),
    );
  const foodoraForLocation = (code: string, period: string) =>
    sum(
      foodoraRows
        .filter((r) => r.location_code === code && r.period_start === period)
        .map((r) => r.payout_amount),
    );

  // Ein Monat zählt für den Vergleich nur, wenn für ihn überhaupt eine
  // Abrechnung erfasst ist. Wolt startet im August 2025, Foodora ebenso —
  // ein 12-Monats-Zeitraum gegen zwei erfasste Vorjahresmonate gerechnet
  // ergäbe sonst Fantasiewerte wie "+969 %".
  const hasWolt = (p: string) => woltRows.some((r) => r.period_start === p);
  const hasFoodora = (p: string) => foodoraRows.some((r) => r.period_start === p);
  const hasAny = (p: string) => hasWolt(p) || hasFoodora(p);

  const periods = months.map((m) => m.periodStart);
  const prevPeriods = periods.map((p) => shiftYear(p, -1));
  const hasPrevYear = prevPeriods.some((p) => hasAny(p));

  const chart: LieferdiensteChartPoint[] = months.map((m) => {
    const prevPeriod = shiftYear(m.periodStart, -1);
    return {
      label: m.label,
      Wolt: woltFor(m.periodStart),
      Foodora: foodoraFor(m.periodStart),
      VorjahrGesamt: hasAny(prevPeriod) ? gesamtFor(prevPeriod) : null,
    };
  });

  const locations: LocationTotal[] = ACTIVE_LOCATIONS.filter(
    (l) => l.hasWolt || l.hasFoodora,
  )
    .map((loc) => {
      const wolt = sum(periods.map((p) => woltForLocation(loc.code, p)));
      const foodora = sum(periods.map((p) => foodoraForLocation(loc.code, p)));
      const yoy = compareYoy(
        months,
        (p) => woltForLocation(loc.code, p) + foodoraForLocation(loc.code, p),
        { hasData: hasAny },
      );
      return {
        code: loc.code,
        name: loc.shortName,
        wolt,
        foodora,
        total: wolt + foodora,
        prevTotal: yoy.previous,
        yoy,
      };
    })
    .filter((l) => l.total > 0 || (l.prevTotal ?? 0) > 0)
    .sort((a, b) => b.total - a.total);

  return {
    months,
    chart,
    locations,
    kpis: {
      total: sum(periods.map(gesamtFor)),
      yoy: compareYoy(months, gesamtFor, { hasData: hasAny }),
      woltTotal: sum(periods.map(woltFor)),
      woltYoy: compareYoy(months, woltFor, { hasData: hasWolt }),
      foodoraTotal: sum(periods.map(foodoraFor)),
      foodoraYoy: compareYoy(months, foodoraFor, { hasData: hasFoodora }),
      hasPrevYear,
    },
  };
}
