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

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null) return "–";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "–";
  return new Intl.NumberFormat("de-AT").format(value);
}

export function formatConversionRate(value: number | null | undefined): string {
  if (value == null) return "–";
  return `${(value * 100).toFixed(2)}%`;
}
