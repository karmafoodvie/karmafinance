// Kanalübergreifende Produktverkäufe.
//
// Quelle ist die Supabase-View public.product_sales_monthly, die POS
// (Kassensystem), Shopify und die Schrankerl-Wochenbestellungen
// zusammenführt und Produktnamen über product_alias vereinheitlicht.
//
// ACHTUNG Stückzahlen: Shopify liefert je Produkt nur die Anzahl
// BESTELLUNGEN, keine Stückzahl. Deshalb wird "Stück" und "Bestellungen"
// überall getrennt ausgewiesen und nie addiert. Umsatz ist über alle
// Kanäle vergleichbar (jeweils netto).

import { createClient } from "@/lib/supabase/server";
import { sum } from "@/lib/calculations";
import { monthsBetween, type MonthBucket } from "@/lib/b2b";

export type ProductChannel =
  | "stores"
  | "shopify"
  | "schrankerl"
  | "b2b_pos"
  | "catering";

export interface ChannelDef {
  key: ProductChannel;
  label: string;
  color: string;
  /** true = liefert Stückzahlen, false = nur Bestellungen */
  hasQuantity: boolean;
  hint: string;
}

export const PRODUCT_CHANNELS: ChannelDef[] = [
  {
    key: "stores",
    label: "Stores",
    color: "#2a78d6",
    hasQuantity: true,
    hint: "Ladenverkauf über das Kassensystem, alle Standorte.",
  },
  {
    key: "shopify",
    label: "Webshop",
    color: "#e94e1b",
    hasQuantity: false,
    hint: "karmafood.at. Shopify liefert je Produkt nur die Anzahl Bestellungen, keine Stückzahl.",
  },
  {
    key: "schrankerl",
    label: "Schrankerl",
    color: "#1baf7a",
    hasQuantity: true,
    hint: "Wochenbestellungen aus den Schrankerl-Kühlschränken.",
  },
  {
    key: "b2b_pos",
    label: "B2B (Kassa)",
    color: "#eda100",
    hasQuantity: true,
    hint: "Positionen, die im Kassensystem auf die Kategorie B2B gebucht sind.",
  },
  {
    key: "catering",
    label: "Catering",
    color: "#4a3aa7",
    hasQuantity: true,
    hint: "Catering-Positionen aus dem Kassensystem. Eigenes Geschäft, kein B2B.",
  },
];

export const CHANNEL_LABEL: Record<ProductChannel, string> = Object.fromEntries(
  PRODUCT_CHANNELS.map((c) => [c.key, c.label]),
) as Record<ProductChannel, string>;

export interface ProductSalesRow {
  channel: ProductChannel;
  product_name: string;
  period_start: string;
  quantity: number | null;
  orders: number | null;
  revenue: number | null;
}

export interface ProductGroupRow {
  product_name: string;
  product_group: string;
  product_type: string | null;
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getProductSales(
  fromPeriod: string,
  toPeriod: string,
): Promise<ProductSalesRow[]> {
  const supabase = await createClient();
  // Supabase deckelt ohne range() bei 1000 Zeilen — für lange Zeiträume
  // seitenweise holen, sonst fehlen stillschweigend Produkte.
  const pageSize = 1000;
  const all: ProductSalesRow[] = [];
  for (let page = 0; page < 40; page += 1) {
    const { data, error } = await supabase
      .from("product_sales_monthly")
      .select("*")
      .gte("period_start", fromPeriod)
      .lte("period_start", toPeriod)
      .order("period_start")
      .order("product_name")
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as ProductSalesRow[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

export async function getProductGroups(): Promise<ProductGroupRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_group_map")
    .select("product_name, product_group, product_type");
  if (error) throw error;
  return (data ?? []) as ProductGroupRow[];
}

// ─── Aggregation ────────────────────────────────────────────────────────────

export interface ChannelCell {
  quantity: number | null;
  orders: number | null;
  revenue: number;
}

export interface ProductSummary {
  product: string;
  group: string | null;
  /** Stückzahl über alle Kanäle, die Stück liefern (ohne Shopify) */
  totalQuantity: number;
  /** Bestellungen im Webshop */
  shopifyOrders: number;
  totalRevenue: number;
  byChannel: Record<ProductChannel, ChannelCell | undefined>;
  channels: ProductChannel[];
}

export interface ProductMonthPoint {
  label: string;
  periodStart: string;
  [channel: string]: number | string;
}

export interface ProdukteView {
  months: MonthBucket[];
  products: ProductSummary[];
  groups: string[];
  kpis: {
    produkteMitUmsatz: number;
    gesamtUmsatz: number;
    gesamtStueck: number;
    webshopBestellungen: number;
  };
  /** Nur gesetzt, wenn ein Produkt ausgewählt ist */
  selected: {
    product: ProductSummary;
    monthly: ProductMonthPoint[];
  } | null;
}

function emptyCell(): ChannelCell {
  return { quantity: null, orders: null, revenue: 0 };
}

function addInto(cell: ChannelCell, row: ProductSalesRow): void {
  if (row.quantity != null) cell.quantity = (cell.quantity ?? 0) + Number(row.quantity);
  if (row.orders != null) cell.orders = (cell.orders ?? 0) + Number(row.orders);
  cell.revenue += Number(row.revenue ?? 0);
}

export async function buildProdukteView(opts: {
  from: string;
  to: string;
  query?: string;
  group?: string;
  selected?: string;
}): Promise<ProdukteView> {
  const months = monthsBetween(opts.from, opts.to);
  const [rows, groupRows] = await Promise.all([
    getProductSales(opts.from, opts.to),
    getProductGroups(),
  ]);

  const groupOf = new Map(groupRows.map((g) => [g.product_name, g.product_group]));

  const byProduct = new Map<string, ProductSummary>();
  for (const row of rows) {
    if (!row.product_name) continue;
    let entry = byProduct.get(row.product_name);
    if (!entry) {
      entry = {
        product: row.product_name,
        group: groupOf.get(row.product_name) ?? null,
        totalQuantity: 0,
        shopifyOrders: 0,
        totalRevenue: 0,
        byChannel: {} as Record<ProductChannel, ChannelCell | undefined>,
        channels: [],
      };
      byProduct.set(row.product_name, entry);
    }
    const cell = (entry.byChannel[row.channel] ??= emptyCell());
    addInto(cell, row);
    entry.totalRevenue += Number(row.revenue ?? 0);
    if (row.channel === "shopify") entry.shopifyOrders += Number(row.orders ?? 0);
    else entry.totalQuantity += Number(row.quantity ?? 0);
  }

  for (const entry of byProduct.values()) {
    entry.channels = PRODUCT_CHANNELS.filter(
      (c) => entry.byChannel[c.key] != null,
    ).map((c) => c.key);
  }

  let products = [...byProduct.values()].sort(
    (a, b) => b.totalRevenue - a.totalRevenue,
  );

  const groups = [...new Set(products.map((p) => p.group).filter(Boolean))]
    .sort() as string[];

  // Auswahl vor dem Filtern auflösen, damit ein Direktlink auf ein Produkt
  // auch dann funktioniert, wenn gerade ein Gruppenfilter aktiv ist.
  const selectedProduct = opts.selected
    ? (byProduct.get(opts.selected) ?? null)
    : null;

  if (opts.group) {
    products = products.filter((p) => p.group === opts.group);
  }
  if (opts.query) {
    const q = opts.query.trim().toLowerCase();
    if (q) products = products.filter((p) => p.product.toLowerCase().includes(q));
  }

  let selected: ProdukteView["selected"] = null;
  if (selectedProduct) {
    const monthRows = rows.filter((r) => r.product_name === selectedProduct.product);
    const monthly: ProductMonthPoint[] = months.map((m) => {
      const point: ProductMonthPoint = {
        label: m.label,
        periodStart: m.periodStart,
      };
      for (const c of PRODUCT_CHANNELS) {
        const hit = monthRows.filter(
          (r) => r.channel === c.key && r.period_start === m.periodStart,
        );
        point[c.key] = sum(hit.map((r) => Number(r.revenue ?? 0)));
        point[`${c.key}_qty`] = sum(
          hit.map((r) => Number(r.quantity ?? r.orders ?? 0)),
        );
      }
      return point;
    });
    selected = { product: selectedProduct, monthly };
  }

  return {
    months,
    products,
    groups,
    kpis: {
      produkteMitUmsatz: products.filter((p) => p.totalRevenue !== 0).length,
      gesamtUmsatz: sum(products.map((p) => p.totalRevenue)),
      gesamtStueck: sum(products.map((p) => p.totalQuantity)),
      webshopBestellungen: sum(products.map((p) => p.shopifyOrders)),
    },
    selected,
  };
}
