// EINE Stelle für alle Zeitraum- und Vorjahresvergleiche der App.
//
// Warum das zentral sein muss: vorher hat jede Seite ihren eigenen
// Vorjahresvergleich gerechnet, mit unterschiedlichen Regeln. Ergebnis waren
// Prozentzahlen, die sich widersprochen haben — z.B. "Umsatz gesamt -3,8 %"
// auf dem Dashboard, obwohl der saubere Vergleich -14,5 % ergibt.
//
// Die zwei Regeln, die hier gelten und ausnahmslos für JEDE Seite gelten:
//
// 1. FEHLENDE DATEN SIND KEINE NULL. Für die Lunch-Locations liegen erst ab
//    Jänner 2025 Zahlen in der Datenbank — die Standorte gab es aber vorher
//    auch. Ein Vorjahresmonat ohne erfasste Daten darf deshalb nicht als
//    "0 € Umsatz" in den Vergleich einfließen, sondern muss auf BEIDEN Seiten
//    aus dem Vergleich fallen.
//
// 2. DER LAUFENDE MONAT ZÄHLT NICHT. Ein angebrochener Monat gegen einen
//    vollen Vorjahresmonat gerechnet ergibt immer ein zu schlechtes Bild.
//    Er fliegt aus dem Vergleich (nicht aus der Summe — die zeigt weiter den
//    gewählten Zeitraum).
//
// Jeder Prozentwert, der in der App angezeigt wird, trägt daher sein
// Vergleichsfenster als Label mit sich ("vs. Jän–Aug 25"). Kein Prozentwert
// ohne Basis.

import { format, addMonths, isSameMonth, isLastDayOfMonth } from "date-fns";
import { de } from "date-fns/locale";
import { yoyPercent } from "@/lib/calculations";

export interface MonthBucket {
  periodStart: string; // YYYY-MM-01
  label: string; // "Jän 26"
}

/** Monatsliste von..bis (beide inklusive). Safety-Guard gegen Endlosschleifen. */
export function monthsInRange(fromPeriod: string, toPeriod: string): MonthBucket[] {
  const out: MonthBucket[] = [];
  let cursor = new Date(`${fromPeriod}T00:00:00`);
  const end = new Date(`${toPeriod}T00:00:00`);
  let guard = 0;
  while (cursor <= end && guard < 600) {
    out.push({
      periodStart: format(cursor, "yyyy-MM-01"),
      label: format(cursor, "MMM yy", { locale: de }),
    });
    cursor = addMonths(cursor, 1);
    guard += 1;
  }
  return out;
}

/** Verschiebt eine Periode um n Jahre. */
export function shiftYear(periodStart: string, years: number): string {
  const [y, m] = periodStart.split("-");
  return `${Number(y) + years}-${m}-01`;
}

/** Ist das der laufende, noch nicht abgeschlossene Monat? */
export function isRunningMonth(periodStart: string, today = new Date()): boolean {
  const d = new Date(`${periodStart}T00:00:00`);
  return isSameMonth(d, today) && !isLastDayOfMonth(today);
}

function monthName(periodStart: string): string {
  // date-fns liefert "Aug." / "Jän." — der Punkt stört in Labels wie
  // "vs. Jän–Aug 25", deshalb raus.
  return format(new Date(`${periodStart}T00:00:00`), "MMM", { locale: de }).replace(".", "");
}
function yearShort(periodStart: string): string {
  return periodStart.slice(2, 4);
}

/** "Jän–Aug 25", "Aug 25" oder "Nov 24–Feb 25" */
function spanLabel(first: string, last: string): string {
  if (first === last) return `${monthName(first)} ${yearShort(first)}`;
  if (first.slice(0, 4) === last.slice(0, 4)) {
    return `${monthName(first)}–${monthName(last)} ${yearShort(last)}`;
  }
  return `${monthName(first)} ${yearShort(first)}–${monthName(last)} ${yearShort(last)}`;
}

export interface YoyResult {
  /** Summe der verglichenen Monate im gewählten Zeitraum */
  current: number | null;
  /** Summe derselben Monate ein Jahr früher */
  previous: number | null;
  /** Veränderung in Prozent, null wenn kein valider Vergleich möglich */
  pct: number | null;
  /** Wie viele Monate tatsächlich verglichen wurden */
  months: number;
  /** Wie viele Monate der gewählte Zeitraum hat */
  ofMonths: number;
  /** Label des Vergleichsfensters im Vorjahr, z.B. "Jän–Aug 25" */
  prevLabel: string | null;
  /** Label des Vergleichsfensters im aktuellen Zeitraum, z.B. "Jän–Aug 26" */
  currentLabel: string | null;
  /** true, wenn nicht der ganze gewählte Zeitraum verglichen werden konnte */
  partial: boolean;
  /** true, wenn der laufende Monat ausgeklammert wurde */
  runningMonthExcluded: boolean;
  /** true, wenn es Vorjahresdaten gibt, der Vorjahreswert aber 0 ist (= neuer Kanal) */
  newChannel: boolean;
}

export const EMPTY_YOY: YoyResult = {
  current: null,
  previous: null,
  pct: null,
  months: 0,
  ofMonths: 0,
  prevLabel: null,
  currentLabel: null,
  partial: false,
  runningMonthExcluded: false,
  newChannel: false,
};

/**
 * Vergleicht einen Zeitraum mit demselben Zeitraum im Vorjahr — aber nur über
 * die Monate, die auf beiden Seiten erfasst sind und abgeschlossen sind.
 *
 * @param months    Monate des gewählten Zeitraums
 * @param valueFor  Wert eines Monats (null = kein Wert)
 * @param hasData   Liegen für diesen Monat überhaupt Daten vor? Default: valueFor(p) != null.
 *                  Wichtig für Ströme, bei denen 0 ein echter Wert ist.
 */
export function compareYoy(
  months: MonthBucket[],
  valueFor: (period: string) => number | null,
  options: { hasData?: (period: string) => boolean; today?: Date } = {},
): YoyResult {
  const today = options.today ?? new Date();
  const hasData = options.hasData ?? ((p: string) => valueFor(p) != null);

  const usable = months
    .map((m) => m.periodStart)
    .filter((p) => !isRunningMonth(p, today))
    .filter((p) => hasData(p) && hasData(shiftYear(p, -1)));

  const runningMonthExcluded = months.some((m) => isRunningMonth(m.periodStart, today));

  if (usable.length === 0) {
    return { ...EMPTY_YOY, ofMonths: months.length, runningMonthExcluded };
  }

  const current = usable.reduce((acc, p) => acc + (valueFor(p) ?? 0), 0);
  const previous = usable.reduce((acc, p) => acc + (valueFor(shiftYear(p, -1)) ?? 0), 0);

  const first = usable[0];
  const last = usable[usable.length - 1];

  return {
    current,
    previous,
    pct: yoyPercent(current, previous),
    months: usable.length,
    ofMonths: months.length,
    prevLabel: spanLabel(shiftYear(first, -1), shiftYear(last, -1)),
    currentLabel: spanLabel(first, last),
    partial: usable.length < months.length,
    runningMonthExcluded,
    newChannel: previous === 0 && current > 0,
  };
}

/**
 * Erklärtext für den Infobutton einer Kachel — sagt in einem Satz, worauf sich
 * der Prozentwert bezieht. Wird überall gleich formuliert.
 */
export function yoyErklaerung(yoy: YoyResult, was: string): string {
  if (yoy.pct == null && !yoy.newChannel) {
    return `Für ${was} gibt es in diesem Zeitraum keinen Vorjahresvergleich — im Vorjahr liegen für diese Monate keine Daten vor.`;
  }
  const rest =
    yoy.partial || yoy.runningMonthExcluded
      ? ` Verglichen werden ${yoy.months} von ${yoy.ofMonths} Monaten des gewählten Zeitraums${
          yoy.runningMonthExcluded ? " (der laufende Monat bleibt außen vor, weil er noch nicht fertig ist)" : ""
        }${yoy.partial ? "; für die übrigen Monate fehlen Vorjahresdaten" : ""}.`
      : "";
  if (yoy.newChannel) {
    return `${was}: im Vorjahreszeitraum (${yoy.prevLabel}) kein Umsatz — der Kanal ist neu, deshalb keine Prozentangabe.${rest}`;
  }
  return `${was}: ${yoy.currentLabel} gegen ${yoy.prevLabel}.${rest}`;
}
