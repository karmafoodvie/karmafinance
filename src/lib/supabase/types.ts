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

// Auto-importierte Schrankerl Wochenbestellungen (aus Outlook-PDFs via Scheduled Task)
export interface SchrankelrWeeklySummary {
  kw: number;
  year: number;
  order_number: string | null;
  order_date: string | null;
  delivery_date: string | null;
  total_netto: number | null;
  total_vat: number | null;
  total_brutto: number | null;
  imported_at: string;
}

export interface SchrankelrWeeklyOrder {
  id: number;
  kw: number;
  year: number;
  order_number: string | null;
  order_date: string | null;
  delivery_date: string | null;
  product_name: string;
  quantity: number;
  unit_price_netto: number;
  amount_netto: number;
  imported_at: string;
}

// Kategorie-Statistiken für KategorienCharts (aggregiert aus POS-Daten)
// Normalisiert auf Tage, an denen die Kategorie angeboten wurde.
export interface CategoryStat {
  category: string;
  days_served: number;
  total_qty: number;
  qty_per_day: number;
  total_revenue: number;
  revenue_per_day: number;
}

// Monatliche Kategorie-Daten für Trendchart (normalisiert)
export interface CategoryMonthly {
  category: string;
  month_start: string; // YYYY-MM-01
  revenue_per_day: number;
}

// ─── B2B-Vertriebskanäle ────────────────────────────────────────────────────
// Stammdaten der Kanäle. channel_group trennt Handel (Produktverkauf an
// Gurkerl/Ototo/Alfies/Billa), Kühlschränke (Schrankerl, Ritual Vend) und
// Catering. Catering ist ein EIGENES Geschäft und zählt nicht zum B2B-Umsatz,
// liegt hier nur im selben Schema.
export interface B2BChannelRow {
  channel_key: string;
  label: string;
  channel_group: "handel" | "vending" | "catering";
  color: string;
  sort_order: number;
  active: boolean;
}

// Nettoumsatz je Kanal und Monat, Quelle: Odoo sale.order Export.
export interface B2BChannelMonthlyRow {
  id: string;
  channel_key: string;
  period_start: string; // YYYY-MM-01
  revenue_net: number | null;
  note: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Kanalübergreifende Produktverkäufe ─────────────────────────────────────
// Produktverkäufe im Webshop je Monat. ACHTUNG: orders = Anzahl Bestellungen,
// die das Produkt enthalten — Shopify liefert auf Produktebene keine
// Stückzahl. Niemals mit POS-Stückzahlen addieren.
export interface ShopifyProductMonthly {
  id: string;
  period_start: string;
  product_title: string;
  orders: number | null;
  net_sales: number | null;
  gross_sales: number | null;
  updated_at: string;
}

// Vereinheitlicht Produktnamen über Kanäle hinweg, z.B. Shopify
// "Mango Chili Hot Sauce" -> Kassa "Mango Chilli Hot Sauce".
export interface ProductAlias {
  source_channel: string; // 'pos' | 'shopify' | 'schrankerl'
  source_name: string;
  canonical_name: string;
  updated_at: string;
}

// Zuordnung Produkt -> Produktgruppe (z.B. "Retail & Merch").
export interface ProductGroupMap {
  product_name: string;
  product_group: string;
  product_type: string | null;
  updated_at: string;
}

// Zeile der View public.product_sales_monthly: POS, Shopify und Schrankerl
// vereint. quantity und orders sind nie gleichzeitig gesetzt.
export interface ProductSalesMonthly {
  channel: "stores" | "shopify" | "schrankerl" | "b2b_pos" | "catering";
  product_name: string;
  period_start: string;
  quantity: number | null;
  orders: number | null;
  revenue: number | null;
}
