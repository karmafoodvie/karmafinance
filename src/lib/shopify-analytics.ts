/**
 * Datenzugriff fuer die neue Shopify-Analyse-Seite.
 *
 * Ruft RPCs auf, die supabase/migrations/20261006120000_shopify_daily_and_finance_chat.sql
 * anlegt: get_shopify_period_kpis, get_shopify_daily_series, get_shopify_top_products,
 * get_shopify_data_status. Keine neue Eingabe-Logik hier -- das "manuell
 * nachtragen"-Feld bleibt die bestehende Insert/Update-Funktion fuer
 * shopify_monthly, die unveraendert weiterlaeuft.
 *
 */
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export type CompareMode = "yoy" | "mom";
export type DataStatus = "ok" | "missing" | "stale";

export interface ShopifyKpiRow {
  metric_key: "revenue_gross" | "revenue_net" | "orders" | "aov" | "conversion_rate" | "sessions";
  label: string;
  unit: "EUR" | "count" | "percent";
  value: number | null;
  compare_value: number | null;
  compare_pct: number | null;
  compare_available: boolean;
  compare_note: string;
}

export interface ShopifyDailyRow {
  day_date: string;
  orders_count: number;
  net_sales: number;
  total_sales: number;
  sessions: number;
  conversion_rate: number;
}

export interface ShopifyTopProduct {
  product_title: string;
  net_sales: number;
  gross_sales: number;
  orders: number;
}

/** YYYY-MM-01 fuer den uebergebenen Monat (Default: aktueller Monat). */
export function periodStartOf(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function fetchShopifyKpis(
  periodStart: string,
  compareMode: CompareMode = "yoy"
): Promise<ShopifyKpiRow[]> {
  const { data, error } = await supabase.rpc("get_shopify_period_kpis", {
    p_period_start: periodStart,
    p_compare_mode: compareMode,
  });
  if (error) {
    console.error("get_shopify_period_kpis fehlgeschlagen:", error.message);
    return [];
  }
  return (data ?? []) as ShopifyKpiRow[];
}

export async function fetchShopifyDailySeries(periodStart: string): Promise<ShopifyDailyRow[]> {
  const { data, error } = await supabase.rpc("get_shopify_daily_series", {
    p_period_start: periodStart,
  });
  if (error) {
    console.error("get_shopify_daily_series fehlgeschlagen:", error.message);
    return [];
  }
  return (data ?? []) as ShopifyDailyRow[];
}

export async function fetchShopifyTopProducts(
  periodStart: string,
  limit = 5
): Promise<ShopifyTopProduct[]> {
  const { data, error } = await supabase.rpc("get_shopify_top_products", {
    p_period_start: periodStart,
    p_limit: limit,
  });
  if (error) {
    console.error("get_shopify_top_products fehlgeschlagen:", error.message);
    return [];
  }
  return (data ?? []) as ShopifyTopProduct[];
}

export async function fetchShopifyDataStatus(
  periodStart: string
): Promise<{ status: DataStatus; detail: string }> {
  const { data, error } = await supabase.rpc("get_shopify_data_status", {
    p_period_start: periodStart,
  });
  if (error || !data?.length) {
    return { status: "missing", detail: "Status konnte nicht geladen werden." };
  }
  return data[0] as { status: DataStatus; detail: string };
}

export function formatEUR(value: number | null): string {
  if (value === null || value === undefined) return "–";
  return value.toLocaleString("de-AT", { style: "currency", currency: "EUR" });
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || value === undefined) return "–";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatCompare(row: Pick<ShopifyKpiRow, "compare_pct" | "compare_available" | "compare_note">): string {
  if (!row.compare_available || row.compare_pct === null) return row.compare_note;
  const sign = row.compare_pct > 0 ? "+" : "";
  return `${sign}${row.compare_pct}% ${row.compare_note}`;
}
