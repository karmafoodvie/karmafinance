/**
 * Datenzugriff für das Ampelsystem/die Upload-Checkliste.
 *
 * Ruft zwei SQL-Functions auf, die bereits live auf dem Supabase-Projekt
 * angelegt sind (supabase/migrations/20261001090000_data_checklist_ampelsystem.sql):
 *  - get_monthly_data_checklist(period_start)      -> Vollständigkeit pro Quelle
 *  - check_pos_revenue_consistency(period_start)   -> Kassensystem-Abgleich je Standort
 *
 * TODO(integration): `supabase` durch den bestehenden Client der App ersetzen.
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type AmpelStatus = "green" | "yellow" | "red";

export interface ChecklistRow {
  source_key: string;
  source_label: string;
  status: AmpelStatus;
  detail: string;
  last_updated: string | null;
}

export interface ConsistencyRow {
  location_code: string;
  location_name: string;
  order_daily_revenue: number;
  product_monthly_revenue: number;
  diff: number;
  diff_pct: number | null;
  status: AmpelStatus;
}

/** YYYY-MM-01 für den übergebenen Monat (Default: aktueller Monat). */
export function periodStartOf(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export async function fetchDataChecklist(periodStart: string): Promise<ChecklistRow[]> {
  const { data, error } = await supabase.rpc("get_monthly_data_checklist", {
    p_period_start: periodStart,
  });
  if (error) {
    console.error("get_monthly_data_checklist fehlgeschlagen:", error.message);
    return [];
  }
  return (data ?? []) as ChecklistRow[];
}

export async function fetchRevenueConsistency(periodStart: string): Promise<ConsistencyRow[]> {
  const { data, error } = await supabase.rpc("check_pos_revenue_consistency", {
    p_period_start: periodStart,
  });
  if (error) {
    console.error("check_pos_revenue_consistency fehlgeschlagen:", error.message);
    return [];
  }
  return (data ?? []) as ConsistencyRow[];
}

/** Schlechtester Status einer Liste (für eine zusammenfassende Ampel). */
export function worstStatus(rows: { status: AmpelStatus }[]): AmpelStatus {
  if (rows.some((r) => r.status === "red")) return "red";
  if (rows.some((r) => r.status === "yellow")) return "yellow";
  return "green";
}
