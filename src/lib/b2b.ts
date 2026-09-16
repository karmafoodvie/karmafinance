// B2B-Vertriebskanäle: Daten kommen aus Supabase (b2b_channels +
// b2b_channel_monthly), nicht mehr aus einer statischen Datei im Code.
// Quelle der Zahlen ist der Odoo sale.order Export, eingetragen über /b2b.
//
// Wichtig für die Auswertung: "Catering" ist ein eigenes Geschäft und KEIN
// B2B. Es liegt nur im selben Schema, wird aber überall getrennt ausgewiesen
// (channel_group). B2B = Handel + Kühlschränke.

import { format, addMonths } from "date-fns";
import { de } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { sum, yoyPercent } from "@/lib/calculations";

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

// ─── Monatsraster ───────────────────────────────────────────────────────────

export interface MonthBucket {
  periodStart: string;
  label: string;
}

/** Baut die Monatsliste von..bis. Safety-Guard gegen Endlosschleifen. */
export function monthsBetween(fromPeriod: string, toPeriod: string): MonthBucket[] {
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

/** Verschiebt eine Periode um n Jahre — für den Vorjahresvergleich. */
export function shiftYear(periodStart: string, years: number): string {
  const [y, m] = periodStart.split("-");
  return `${Number(y) + years}-${m}-01`;
}

// ─── Aggregation ────────────────────────────────────────────────────────────

export interface ChannelTotal extends B2BChannel {
  total: number;
  prevTotal: number | null;
  yoy: number | null;
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
    b2bPrev: number | null;
    b2bYoy: number | null;
    handelTotal: number;
    handelYoy: number | null;
    vendingTotal: number;
    vendingYoy: number | null;
    cateringTotal: number;
    cateringYoy: number | null;
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
  const months = monthsBetween(range.from, range.to);
  const prevFrom = shiftYear(range.from, -1);
  const prevTo = shiftYear(range.to, -1);

  // Ein Query über den gesamten Bereich inkl. Vorjahr — spart einen Roundtrip.
  const [channels, rows] = await Promise.all([
    getB2BChannels(),
    getB2BMonthlyRange(prevFrom, range.to),
  ]);

  const byKey = new Map<string, number>();
  for (const r of rows) {
    byKey.set(keyOf(r.channel_key, r.period_start), r.revenue_net ?? 0);
  }

  const valueFor = (channelKey: string, periodStart: string): number =>
    byKey.get(keyOf(channelKey, periodStart)) ?? 0;

  // Gibt es für den Vorjahreszeitraum überhaupt Daten? Sonst zeigen wir
  // "kein Vorjahr" statt einer irreführenden -100%-Veränderung.
  const prevMonths = months.map((m) => shiftYear(m.periodStart, -1));
  const hasPrevYear = rows.some((r) => prevMonths.includes(r.period_start));

  const totalsFor = (
    filter: (c: B2BChannel) => boolean,
    periods: string[],
  ): number =>
    sum(
      channels
        .filter(filter)
        .flatMap((c) => periods.map((p) => valueFor(c.channel_key, p))),
    );

  const curPeriods = months.map((m) => m.periodStart);

  const channelTotals: ChannelTotal[] = channels.map((c) => {
    const total = sum(curPeriods.map((p) => valueFor(c.channel_key, p)));
    const prevTotal = hasPrevYear
      ? sum(prevMonths.map((p) => valueFor(c.channel_key, p)))
      : null;
    return { ...c, total, prevTotal, yoy: yoyPercent(total, prevTotal) };
  });

  const byGroup = (g: ChannelGroup) =>
    channelTotals.filter((c) => c.channel_group === g);

  const groupTotal = (g: ChannelGroup, periods: string[]) =>
    totalsFor((c) => c.channel_group === g, periods);

  const b2bTotal = totalsFor((c) => isB2B(c.channel_group), curPeriods);
  const b2bPrev = hasPrevYear
    ? totalsFor((c) => isB2B(c.channel_group), prevMonths)
    : null;

  const handelTotal = groupTotal("handel", curPeriods);
  const vendingTotal = groupTotal("vending", curPeriods);
  const cateringTotal = groupTotal("catering", curPeriods);

  const chart: B2BChartPoint[] = months.map((m) => {
    const point: B2BChartPoint = { label: m.label };
    for (const c of channels) {
      point[c.channel_key] = valueFor(c.channel_key, m.periodStart);
    }
    const prevPeriod = shiftYear(m.periodStart, -1);
    point.VorjahrB2B = hasPrevYear
      ? sum(
          channels
            .filter((c) => isB2B(c.channel_group))
            .map((c) => valueFor(c.channel_key, prevPeriod)),
        )
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
      b2bPrev,
      b2bYoy: yoyPercent(b2bTotal, b2bPrev),
      handelTotal,
      handelYoy: hasPrevYear
        ? yoyPercent(handelTotal, groupTotal("handel", prevMonths))
        : null,
      vendingTotal,
      vendingYoy: hasPrevYear
        ? yoyPercent(vendingTotal, groupTotal("vending", prevMonths))
        : null,
      cateringTotal,
      cateringYoy: hasPrevYear
        ? yoyPercent(cateringTotal, groupTotal("catering", prevMonths))
        : null,
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
