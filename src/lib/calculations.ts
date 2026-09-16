// Alle abgeleiteten Kennzahlen leben hier zentral — keine Berechnung
// verstreut in Komponenten, damit "keine manuellen Formeln mehr" auch
// wirklich für alle Ansichten gilt.

export function yoyPercent(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function sum(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}

export function average(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return sum(nums) / nums.length;
}

const eurFormatter = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eurFormatterPrecise = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export function formatEur(value: number | null | undefined, precise = false): string {
  if (value == null) return "–";
  return precise ? eurFormatterPrecise.format(value) : eurFormatter.format(value);
}

// Prozentformat für die ganze App: österreichisch (Komma als Dezimaltrenner,
// schmales Leerzeichen vor dem %), immer EINE Nachkommastelle und bei
// Veränderungen immer mit Vorzeichen. Vorher gab es vier verschiedene
// Schreibweisen ("+49.1%", "+49%", "12.3 %", "2.34%") — nebeneinander in
// derselben Tabelle sah das aus wie unterschiedliche Kennzahlen.
const percentChangeFormatter = new Intl.NumberFormat("de-AT", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const percentShareFormatter = new Intl.NumberFormat("de-AT", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Veränderung in Prozent, z.B. "+12,4 %" / "−3,8 %". */
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "–";
  return `${percentChangeFormatter.format(value)} %`;
}

/** Anteil in Prozent (ohne Vorzeichen), z.B. "55,5 %". */
export function formatShare(value: number | null | undefined): string {
  if (value == null) return "–";
  return `${percentShareFormatter.format(value)} %`;
}

/** Anteil von Teil an Ganzem, direkt als "55,5 %". */
export function shareOf(part: number, total: number): string {
  if (!total) return "–";
  return formatShare((part / total) * 100);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "–";
  return new Intl.NumberFormat("de-AT").format(value);
}

export function formatConversionRate(value: number | null | undefined): string {
  if (value == null) return "–";
  return `${(value * 100).toFixed(2)}%`;
}
