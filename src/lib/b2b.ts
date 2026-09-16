// B2B-Vertriebskanäle: Daten kommen aus Supabase (b2b_channels +
// b2b_channel_monthly), nicht mehr aus einer statischen Datei im Code.
// Quelle der Zahlen ist der Odoo sale.order Export, eingetragen über /b2b.
//
// Wichtig für die Auswertung: "Catering" ist ein eigenes Geschäft und KEIN
// B2B. Es liegt nur im selben Schema, wird aber überall getrennt ausgewiesen
// (channel_group). B2B = Handel + Kühlschränke.

import { createClient } from "@/lib/supabase/server";
import { sum } from "@/lib/calculations";
import {
  compareYoy,
  monthsInRange,
  shiftYear,
  type MonthBucket,
  type YoyResult,
} from "@/lib/vergleich";

// Zeitraum- und Vorjahreslogik kommt zentral aus @/lib/vergleich, damit die
// B2B-Seite exakt dieselben Regeln anwendet wie Dashboard und Lieferdienste.
export { monthsInRange as monthsBetween, shiftYear };
export type { MonthBucket };

export type ChannelGroup = "handel" | "vending" | "catering";

export interface B2BChannel {
  channel_key: string;
  label: string;
  channel_group: ChannelGroup;
  color: string;
  sort_order: number;
  active: boolean;
}

export interface B2BChannelMonthly {
  id: string;
  channel_key: string;
  period_start: string; // YYYY-MM-01
  revenue_net: number | null;
  note: string | null;
  updated_at: string;
}

export const GROUP_LABEL: Record<ChannelGroup, string> = {
  handel: "Handel",
  vending: "Kühlschränke",
  catering: "Catering",
};

// Nur diese beiden Gruppen zählen als B2B — Catering wird separat gezeigt.
export const B2B_GROUPS: ChannelGroup[] = ["handel", "vending"];

export function isB2B(group: ChannelGroup): boolean {
  return B2B_GROUPS.includes(group);
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getB2BChannels(): Promise<B2BChannel[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("b2b_channels")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as B2BChannel[];
}

/** Monatswerte inklusive Grenzen (fromPeriod..toPeriod, jeweils YYYY-MM-01). */
export async function getB2BMonthlyRange(
  fromPeriod: string,
  toPeriod: string,
): Promise<B2BChannelMonthly[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("b2b_channel_monthly")
    .select("*")
    .gte("period_start", fromPeriod)
    .lte("period_start", toPeriod)
    .order("period_start");
  if (error) throw error;
  return (data ?? []) as B2BChannelMonthly[];
}

export async function getB2BMonthlyForPeriod(
  periodStart: string,
): Promise<B2BChannelMonthly[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("b2b_channel_monthly")
    .select("*")
    .eq("period_start", periodStart);
  if (error) throw error;
  return (data ?? []) as B2BChannelMonthly[];
}

// ─── Aggregation ────────────────────────────────────────────────────────────

export interface ChannelTotal extends B2BChannel {
  total: number;
  prevTotal: number | null;
  yoy: YoyResult;
}

export interface B2BChartPoint {
  label: string;
  /** Kanalumsätze, Schlüssel = channel_key */
  [channelKey: string]: number | string | null;
}

export interface B2BView {
  months: MonthBucket[];
  channels: B2BChannel[];
  /** Kanäle der Gruppen handel+vending, nach Umsatz sortiert */
  b2bChannels: ChannelTotal[];
  cateringChannels: ChannelTotal[];
  chart: B2BChartPoint[];
  kpis: {
    b2bTotal: number;
    b2bYoy: YoyResult;
    handelTotal: number;
    handelYoy: YoyResult;
    vendingTotal: number;
    vendingYoy: YoyResult;
    cateringTotal: number;
    cateringYoy: YoyResult;
    /** Gibt es für den Vorjahreszeitraum überhaupt vergleichbare Monate? */
    hasPrevYear: boolean;
  };
}

function keyOf(channelKey: string, periodStart: string): string {
  return `${channelKey}|${periodStart}`;
}

/**
 * Baut die komplette /b2b-Ansicht für einen Zeitraum, inklusive
 * Vorjahresvergleich. Holt dafür auch den um ein Jahr verschobenen Zeitraum.
 */
export async function buildB2BView(range: {
  from: string;
  to: string;
}): Promise<B2BView> {
  const months = monthsInRange(range.from, range.to);
  const prevFrom = shiftYear(range.from, -1);

  // Ein Query über den gesamten Bereich inkl. Vorjahr — spart einen Roundtrip.
  const [channels, rows] = await Promise.all([
    getB2BChannels(),
    getB2BMonthlyRange(prevFrom, range.to),
  ]);

  const byKey = new Map<string, number>();
  for (const r of rows) {
    byKey.set(keyOf(r.channel_key, r.period_start), r.revenue_net ?? 0);
  }
  const erfassteMonate = new Set(rows.map((r) => r.period_start));

  const valueFor = (channelKey: string, periodStart: string): number =>
    byKey.get(keyOf(channelKey, periodStart)) ?? 0;

  // Ein Monat ist vergleichbar, wenn für ihn überhaupt B2B-Zahlen erfasst
  // sind. Fehlende Monate fließen NICHT als 0 € in den Vergleich ein.
  const hasData = (p: string) => erfassteMonate.has(p);

  const summeFor = (filter: (c: B2BChannel) => boolean) => (p: string) =>
    sum(channels.filter(filter).map((c) => valueFor(c.channel_key, p)));

  const curPeriods = months.map((m) => m.periodStart);
  const prevMonths = curPeriods.map((p) => shiftYear(p, -1));
  const hasPrevYear = prevMonths.some((p) => hasData(p));

  const channelTotals: ChannelTotal[] = channels.map((c) => {
    const total = sum(curPeriods.map((p) => valueFor(c.channel_key, p)));
    const yoy = compareYoy(months, (p) => valueFor(c.channel_key, p), { hasData });
    return { ...c, total, prevTotal: yoy.previous, yoy };
  });

  const byGroup = (g: ChannelGroup) =>
    channelTotals.filter((c) => c.channel_group === g);

  const groupSum = (g: ChannelGroup) =>
    sum(curPeriods.map((p) => summeFor((c) => c.channel_group === g)(p)));

  const b2bTotal = sum(curPeriods.map((p) => summeFor((c) => isB2B(c.channel_group))(p)));

  const chart: B2BChartPoint[] = months.map((m) => {
    const point: B2BChartPoint = { label: m.label };
    for (const c of channels) {
      point[c.channel_key] = valueFor(c.channel_key, m.periodStart);
    }
    const prevPeriod = shiftYear(m.periodStart, -1);
    point.VorjahrB2B = hasData(prevPeriod)
      ? summeFor((c) => isB2B(c.channel_group))(prevPeriod)
      : null;
    return point;
  });

  return {
    months,
    channels,
    b2bChannels: [...byGroup("handel"), ...byGroup("vending")].sort(
      (a, b) => b.total - a.total,
    ),
    cateringChannels: byGroup("catering"),
    chart,
    kpis: {
      b2bTotal,
      b2bYoy: compareYoy(months, summeFor((c) => isB2B(c.channel_group)), { hasData }),
      handelTotal: groupSum("handel"),
      handelYoy: compareYoy(months, summeFor((c) => c.channel_group === "handel"), { hasData }),
      vendingTotal: groupSum("vending"),
      vendingYoy: compareYoy(months, summeFor((c) => c.channel_group === "vending"), { hasData }),
      cateringTotal: groupSum("catering"),
      cateringYoy: compareYoy(months, summeFor((c) => c.channel_group === "catering"), { hasData }),
      hasPrevYear,
    },
  };
}

/**
 * Schlanke Variante fürs Haupt-Dashboard: B2B- und Catering-Summe je Monat,
 * indiziert nach period_start.
 */
export async function getB2BMonthlyTotals(
  fromPeriod: string,
  toPeriod: string,
): Promise<Record<string, { b2b: number; catering: number }>> {
  const [channels, rows] = await Promise.all([
    getB2BChannels(),
    getB2BMonthlyRange(fromPeriod, toPeriod),
  ]);
  const groupOf = new Map(channels.map((c) => [c.channel_key, c.channel_group]));

  const out: Record<string, { b2b: number; catering: number }> = {};
  for (const r of rows) {
    const bucket = (out[r.period_start] ??= { b2b: 0, catering: 0 });
    const group = groupOf.get(r.channel_key);
    if (group === "catering") bucket.catering += r.revenue_net ?? 0;
    else if (group && isB2B(group)) bucket.b2b += r.revenue_net ?? 0;
  }
  return out;
}
