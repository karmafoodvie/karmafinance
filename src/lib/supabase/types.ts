// Handgeschriebene Typen passend zu supabase/migrations/*.sql.
// Bei Schemaänderungen: entweder hier nachziehen, oder
// `npx supabase gen types typescript --project-id <ref>` laufen lassen
// und diese Datei ersetzen.

export type UserRole = "admin" | "limited";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface LocationRow {
  code: string;
  name: string;
  active: boolean;
  has_wolt: boolean;
  has_foodora: boolean;
}

export interface LocationMonthly {
  id: string;
  location_code: string;
  period_start: string; // YYYY-MM-01
  period_type: "monthly" | "weekly";
  revenue_net: number | null;
  discounts_total: number | null;
  revenue_prev_year_manual: number | null;
  note: string | null;
  created_by: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface ShopifyMonthly {
  id: string;
  period_start: string;
  period_type: "monthly" | "weekly";
  payout_amount: number | null;
  orders_count: number | null;
  conversion_rate: number | null;
  sessions: number | null;
  payout_prev_year_manual: number | null;
  updated_by: string | null;
  updated_at: string;
}

export interface WoltLocationPayout {
  id: string;
  location_code: string;
  period_start: string;
  period_type: "monthly" | "weekly";
  payout_amount: number | null;
  updated_by: string | null;
  updated_at: string;
}

export interface FoodoraMonthly {
  id: string;
  period_start: string;
  period_type: "monthly" | "weekly";
  gross_sales: number | null;
  commission_pct: number | null;
  commission_amount: number | null;
  payout_total: number | null;
  orders_count: number | null;
  updated_by: string | null;
  updated_at: string;
}

export interface FoodoraLocationPayout {
  id: string;
  location_code: string;
  period_start: string;
  period_type: "monthly" | "weekly";
  payout_amount: number | null;
  updated_by: string | null;
  updated_at: string;
}

export interface TgtgLocationPayout {
  id: string;
  location_code: string;
  period_start: string;
  period_type: "monthly" | "weekly";
  meals_saved: number | null;
  revenue_gross: number | null; // Verkaufswert der geretteten Portionen
  fee_amount: number | null; // TGTG-Reservierungsgebühr (inkl. USt.)
  revenue_net: number | null; // Brutto minus TGTG-Gebühr = tatsächliche Auszahlung
  updated_by: string | null;
  updated_at: string;
}

// Unregelmäßige, projektbezogene Umsätze abseits der fixen 6 Lunch-Locations
// (Pop-ups, Kooperationen, Events — z.B. VDW am Standort IST). Freitext
// project_name statt fixer location_code-Liste.
export interface ProjectRevenue {
  id: string;
  project_name: string;
  period_start: string;
  period_type: "monthly" | "weekly";
  revenue_net: number | null;
  note: string | null;
  updated_by: string | null;
  updated_at: string;
}

// Produktverkäufe pro Standort und Monat aus dem Odoo-POS-Export.
// category trennt Shop / Catering / B2B / Rabattzeilen ("All").
export interface PosProductMonthly {
  id: string;
  location_code: string;
  period_start: string;
  product_name: string;
  category: string;
  quantity: number | null;
  revenue: number | null; // Gesamtpreis, brutto nach Rabatten
  margin: number | null;
  updated_at: string;
}

// Freie, datierte Notizen/Ereignisse mit Hashtags — Kontext zu
// Umsatzschwankungen (z.B. "neues Menü", "Schanigarten entfernt").
export interface BusinessEvent {
  id: string;
  event_date: string; // YYYY-MM-DD
  location_code: string | null; // null = allgemein/unternehmensweit
  title: string;
  note: string | null;
  tags: string[];
  created_by: string | null;
  updated_at: string;
}

export interface SchrankelrMonthly {
  id: string;
  period_start: string;
  period_type: "monthly" | "weekly";
  units_sold: number | null;
  revenue_gross: number | null;
  payout_amount: number | null;
  updated_by: string | null;
  updated_at: string;
}
