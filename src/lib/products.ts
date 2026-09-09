import { createClient } from "@/lib/supabase/server";
import { monthsInRange, type DateRange } from "@/lib/dashboard";
import type { PosProductMonthly } from "@/lib/supabase/types";

// Wie viele Produkte im Chart auswählbar sind. Die Tabelle zeigt alle —
// nur die Monatsreihen fürs Chart werden begrenzt, damit nicht die
// komplette Produktmatrix an den Browser geht.
const TREND_LIMIT = 30;

export interface ProductSummary {
  productName: string;
  category: string;
  quantity: number;
  revenue: number;
  margin: number;
  // Veränderung Umsatz erste vs. letzte Hälfte des Zeitraums, in Prozent.
  // null, wenn der Zeitraum zu kurz ist oder vorher kein Umsatz da war.
  trendPct: number | null;
}

export interface ProductTrendPoint {
  label: string;
  [productName: string]: string | number;
}

export async function getPosProducts(
  fromPeriod: string,
  toPeriod: string,
  locationCode?: string,
  category?: string,
): Promise<PosProductMonthly[]> {
  const supabase = await createClient();
  // Supabase/PostgREST liefert pro Abfrage max. 1000 Zeilen. Ein längerer
  // Zeitraum hat aber leicht mehrere tausend Produktzeilen — deshalb hier
  // seitenweise nachladen, bis alles da ist. Sonst würden Umsätze und
  // Trend-Kurven ab der 1000. Zeile einfach fehlen.
  const PAGE = 1000;
  const all: PosProductMonthly[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from("pos_product_monthly")
      .select("*")
      .gte("period_start", fromPeriod)
      .lte("period_start", toPeriod)
      .order("id")
      .range(from, from + PAGE - 1);
    if (locationCode) query = query.eq("location_code", locationCode);
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) throw error;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

export async function getProductCategories(): Promise<string[]> {
  const supabase = await createClient();
  // Distinct über eine RPC wäre schöner, aber ohne eigene DB-Funktion holen
  // wir die Kategorie-Spalte seitenweise und dedupen selbst — sonst würden
  // bei >1000 Zeilen (2025 zuerst eingespielt) die neueren 2026-Kategorien
  // wie "Lassi House" im Filter fehlen.
  const PAGE = 1000;
  const set = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("pos_product_monthly")
      .select("category")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data) set.add(r.category as string);
    if (data.length < PAGE) break;
  }
  return Array.from(set).sort();
}

export async function buildProductData(
  range: DateRange,
  locationCode?: string,
  category?: string,
) {
  const months = monthsInRange(range.from, range.to);
  const rows = await getPosProducts(range.from, range.to, locationCode, category);

  // Summen pro Produkt über den ganzen Zeitraum.
  const byProduct = new Map<
    string,
    { category: string; quantity: number; revenue: number; margin: number }
  >();
  for (const r of rows) {
    const cur = byProduct.get(r.product_name) ?? {
      category: r.category,
      quantity: 0,
      revenue: 0,
      margin: 0,
    };
    cur.quantity += Number(r.quantity ?? 0);
    cur.revenue += Number(r.revenue ?? 0);
    cur.margin += Number(r.margin ?? 0);
    byProduct.set(r.product_name, cur);
  }

  // Für den Trend: Zeitraum halbieren und die Umsätze der beiden Hälften
  // vergleichen. Das zeigt "läuft an / läuft aus" auch dann, wenn kein
  // sauberer Vorjahreswert existiert.
  const half = Math.floor(months.length / 2);
  const firstHalf = new Set(months.slice(0, half).map((m) => m.periodStart));
  const secondHalf = new Set(months.slice(half).map((m) => m.periodStart));
  const halves = new Map<string, { a: number; b: number }>();
  for (const r of rows) {
    const cur = halves.get(r.product_name) ?? { a: 0, b: 0 };
    if (firstHalf.has(r.period_start)) cur.a += Number(r.revenue ?? 0);
    else if (secondHalf.has(r.period_start)) cur.b += Number(r.revenue ?? 0);
    halves.set(r.product_name, cur);
  }

  const summaries: ProductSummary[] = Array.from(byProduct.entries())
    .map(([productName, v]) => {
      const h = halves.get(productName);
      const trendPct =
        half > 0 && h && h.a > 0 ? ((h.b - h.a) / h.a) * 100 : null;
      return { productName, ...v, trendPct };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Monatsreihen nur für die umsatzstärksten Produkte.
  const trendProducts = summaries.slice(0, TREND_LIMIT).map((s) => s.productName);
  const trendSet = new Set(trendProducts);

  const revenueByKey = new Map<string, number>();
  const quantityByKey = new Map<string, number>();
  for (const r of rows) {
    if (!trendSet.has(r.product_name)) continue;
    const key = `${r.product_name}|${r.period_start}`;
    revenueByKey.set(key, (revenueByKey.get(key) ?? 0) + Number(r.revenue ?? 0));
    quantityByKey.set(key, (quantityByKey.get(key) ?? 0) + Number(r.quantity ?? 0));
  }

  function buildTrend(source: Map<string, number>): ProductTrendPoint[] {
    return months.map((m) => {
      const point: ProductTrendPoint = { label: m.label };
      for (const p of trendProducts) {
        point[p] = Math.round((source.get(`${p}|${m.periodStart}`) ?? 0) * 100) / 100;
      }
      return point;
    });
  }

  const totals = summaries.reduce(
    (acc, s) => {
      acc.revenue += s.revenue;
      acc.quantity += s.quantity;
      acc.margin += s.margin;
      return acc;
    },
    { revenue: 0, quantity: 0, margin: 0 },
  );

  return {
    months,
    summaries,
    trendProducts,
    revenueTrend: buildTrend(revenueByKey),
    quantityTrend: buildTrend(quantityByKey),
    totals,
    hasData: rows.length > 0,
  };
}
