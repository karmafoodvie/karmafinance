import { createClient } from "@/lib/supabase/server";
import { monthsInRange, type DateRange } from "@/lib/dashboard";
import type { PosProductMonthly } from "@/lib/supabase/types";

// Wie viele Produkte im Chart auswählbar sind. Die Tabelle zeigt alle —
// nur die Monatsreihen fürs Chart werden begrenzt, damit nicht die
// komplette Produktmatrix an den Browser geht.
const TREND_LIMIT = 30;

// Feste Reihenfolge der Überkategorien für die Anzeige.
export const PRODUCT_GROUPS = [
  "Hauptgerichte",
  "Lunch Combos",
  "Sweets",
  "Drinks",
  "Beilagen & Snacks",
  "Retail & Merch",
  "Rabatte & Sonstiges",
] as const;

export interface ProductGroupInfo {
  group: string;
  type: string | null; // 'Classic' | 'Special' (nur Hauptgerichte)
}

// Zuordnung Produktname -> Überkategorie. Kommt aus product_group_map,
// wird ohne Code-Änderung dort gepflegt. Nicht zugeordnete Produkte
// landen in "Andere".
export async function getProductGroupMap(): Promise<Map<string, ProductGroupInfo>> {
  const supabase = await createClient();
  const map = new Map<string, ProductGroupInfo>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("product_group_map")
      .select("product_name, product_group, product_type")
      .order("product_name")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data) {
      map.set(r.product_name as string, {
        group: r.product_group as string,
        type: (r.product_type as string | null) ?? null,
      });
    }
    if (data.length < PAGE) break;
  }
  return map;
}

function groupOf(map: Map<string, ProductGroupInfo>, name: string): ProductGroupInfo {
  return map.get(name) ?? { group: "Andere", type: null };
}

export interface ProductSummary {
  productName: string;
  category: string;
  group: string;
  type: string | null;
  quantity: number;
  revenue: number;
  margin: number;
  // Veränderung Umsatz erste vs. letzte Hälfte des Zeitraums, in Prozent.
  // null, wenn der Zeitraum zu kurz ist oder vorher kein Umsatz da war.
  trendPct: number | null;
}

export interface GroupTotal {
  group: string;
  quantity: number;
  revenue: number;
}

export interface ProductTrendPoint {
  label: string;
  [productName: string]: string | number;
}

export async function getPosProducts(
  fromPeriod: string,
  toPeriod: string,
  locationCodes?: string[],
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
    if (locationCodes && locationCodes.length > 0)
      query = query.in("location_code", locationCodes);
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
  locationCodes?: string[],
  category?: string,
  group?: string,
  type?: string,
) {
  const months = monthsInRange(range.from, range.to);
  const [allRows, groupMap] = await Promise.all([
    getPosProducts(range.from, range.to, locationCodes, category),
    getProductGroupMap(),
  ]);

  // Überkategorie-Übersicht über ALLE Produkte (unabhängig vom Gruppenfilter),
  // damit die Gruppen-Auswahl immer die vollen Summen zeigt.
  const groupAgg = new Map<string, { quantity: number; revenue: number }>();
  for (const r of allRows) {
    const g = groupOf(groupMap, r.product_name).group;
    const cur = groupAgg.get(g) ?? { quantity: 0, revenue: 0 };
    cur.quantity += Number(r.quantity ?? 0);
    cur.revenue += Number(r.revenue ?? 0);
    groupAgg.set(g, cur);
  }
  const knownGroups: string[] = [...PRODUCT_GROUPS];
  const groupTotals: GroupTotal[] = Array.from(groupAgg.entries())
    .map(([g, v]) => ({ group: g, ...v }))
    .sort((a, b) => {
      const ia = knownGroups.indexOf(a.group);
      const ib = knownGroups.indexOf(b.group);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

  // Auf gewählte Überkategorie (und ggf. Classic/Special) einschränken.
  const rows = group
    ? allRows.filter((r) => {
        const gi = groupOf(groupMap, r.product_name);
        if (gi.group !== group) return false;
        if (type && gi.type !== type) return false;
        return true;
      })
    : allRows;

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
      const gi = groupOf(groupMap, productName);
      return { productName, ...v, group: gi.group, type: gi.type, trendPct };
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
    groupTotals,
    hasData: rows.length > 0,
  };
}

export interface StoreTrendPoint {
  label: string;
  [storeName: string]: string | number;
}

// Entwicklung einer Überkategorie (z.B. Lunch Combos) pro Standort über die
// Zeit — eine Linie je Store, plus Summe je Store. Beantwortet "wo laufen die
// Lunch Combos gut, wo nicht".
export async function buildGroupByLocation(
  range: DateRange,
  group: string,
  locations: { code: string; shortName: string }[],
  type?: string,
) {
  const months = monthsInRange(range.from, range.to);
  const [allRows, groupMap] = await Promise.all([
    getPosProducts(range.from, range.to),
    getProductGroupMap(),
  ]);

  const rows = allRows.filter((r) => {
    const gi = groupOf(groupMap, r.product_name);
    if (gi.group !== group) return false;
    if (type && gi.type !== type) return false;
    return true;
  });

  const codeToName = new Map(locations.map((l) => [l.code, l.shortName]));
  const storeKeys = locations.map((l) => l.shortName);

  const revByKey = new Map<string, number>(); // "store|period"
  const qtyByKey = new Map<string, number>();
  const storeTotalRev = new Map<string, number>();
  const storeTotalQty = new Map<string, number>();
  for (const r of rows) {
    const store = codeToName.get(r.location_code);
    if (!store) continue;
    const k = `${store}|${r.period_start}`;
    revByKey.set(k, (revByKey.get(k) ?? 0) + Number(r.revenue ?? 0));
    qtyByKey.set(k, (qtyByKey.get(k) ?? 0) + Number(r.quantity ?? 0));
    storeTotalRev.set(store, (storeTotalRev.get(store) ?? 0) + Number(r.revenue ?? 0));
    storeTotalQty.set(store, (storeTotalQty.get(store) ?? 0) + Number(r.quantity ?? 0));
  }

  function buildTrend(source: Map<string, number>): StoreTrendPoint[] {
    return months.map((m) => {
      const point: StoreTrendPoint = { label: m.label };
      for (const store of storeKeys) {
        point[store] = Math.round((source.get(`${store}|${m.periodStart}`) ?? 0) * 100) / 100;
      }
      return point;
    });
  }

  const storeTotals = storeKeys
    .map((store) => ({
      label: store,
      revenue: storeTotalRev.get(store) ?? 0,
      quantity: storeTotalQty.get(store) ?? 0,
    }))
    .filter((s) => s.revenue !== 0 || s.quantity !== 0);

  return {
    months,
    storeKeys,
    revenueTrend: buildTrend(revByKey),
    quantityTrend: buildTrend(qtyByKey),
    storeTotals,
    hasData: rows.length > 0,
  };
}
