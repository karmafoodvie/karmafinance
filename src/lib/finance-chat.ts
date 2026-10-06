/**
 * Finanz-Chat Phase 1 (siehe AI-Prompt, Auftrag Teil B, Phasierung Punkt 1):
 * feste Frage-Templates, KEINE freie Texteingabe, KEIN LLM-Call -- jedes
 * Template ruft eine der verifizierten read-only Supabase-RPCs auf (dieselben,
 * die auch die Shopify-Seite fuer ihre KPI-Leiste nutzt) und formatiert das
 * Ergebnis als Antwort inkl. Quelle + Zeitraum.
 *
 * Phase 2 (freie Texteingabe + Function-Calling ueber alle Kanaltabellen)
 * braucht zuerst eine Entscheidung, welche LLM-API das Backend fuer
 * /api/chat nutzen soll (siehe README, Abschnitt "Offen") -- bewusst nicht
 * Teil dieser Lieferung.
 *
 */
import { createClient } from "@/lib/supabase/client";
import { formatEUR, formatPercent, periodStartOf } from "@/lib/shopify-analytics";

const supabase = createClient();

type KpiRpcRow = {
  metric_key: string;
  compare_available: boolean;
  compare_pct: number | null;
  compare_note: string;
  value: number | null;
};
type LocationRpcRow = {
  location_code: string;
  revenue: number | null;
  compare_available: boolean;
  compare_pct: number | null;
  compare_note: string;
};

export type ChatPage = "shopify" | "dashboard";

export interface ChatAnswer {
  text: string;
  source: string;
  period: string;
}

export interface ChatTemplate {
  id: string;
  page: ChatPage;
  question: string;
  run: (periodStart: string) => Promise<ChatAnswer>;
}

function monthLabel(periodStart: string): string {
  return new Date(`${periodStart}T00:00:00`).toLocaleDateString("de-AT", { month: "long", year: "numeric" });
}

export const CHAT_TEMPLATES: ChatTemplate[] = [
  {
    id: "shopify-vs-vormonat",
    page: "shopify",
    question: "Wie hat sich der Umsatz gegenüber letztem Monat entwickelt?",
    async run(periodStart) {
      const { data, error } = await supabase.rpc("get_shopify_period_kpis", {
        p_period_start: periodStart,
        p_compare_mode: "mom",
      });
      const row = (data ?? []).find((r: KpiRpcRow) => r.metric_key === "revenue_gross");
      if (error || !row) return errAnswer("shopify_monthly", periodStart);
      const text = row.compare_available
        ? `Umsatz brutto ${monthLabel(periodStart)}: ${formatEUR(row.value)} (${row.compare_pct > 0 ? "+" : ""}${row.compare_pct}% ${row.compare_note}).`
        : `Umsatz brutto ${monthLabel(periodStart)}: ${formatEUR(row.value)}. Kein Vergleich möglich (${row.compare_note}).`;
      return { text, source: "shopify_monthly (get_shopify_period_kpis)", period: monthLabel(periodStart) };
    },
  },
  {
    id: "shopify-top-produkt",
    page: "shopify",
    question: "Welches Produkt lief diesen Monat am besten?",
    async run(periodStart) {
      const { data, error } = await supabase.rpc("get_shopify_top_products", {
        p_period_start: periodStart,
        p_limit: 1,
      });
      if (error || !data?.length) return errAnswer("shopify_product_monthly", periodStart);
      const p = data[0];
      return {
        text: `Top-Produkt in ${monthLabel(periodStart)}: "${p.product_title}" mit ${formatEUR(p.net_sales)} Nettoumsatz (${p.orders} Bestellungen).`,
        source: "shopify_product_monthly (get_shopify_top_products)",
        period: monthLabel(periodStart),
      };
    },
  },
  {
    id: "shopify-conversion-yoy",
    page: "shopify",
    question: "Wie ist die Conversion Rate im Vergleich zum Vorjahr?",
    async run(periodStart) {
      const { data, error } = await supabase.rpc("get_shopify_period_kpis", {
        p_period_start: periodStart,
        p_compare_mode: "yoy",
      });
      const row = (data ?? []).find((r: KpiRpcRow) => r.metric_key === "conversion_rate");
      if (error || !row) return errAnswer("shopify_monthly", periodStart);
      const text = row.compare_available
        ? `Conversion Rate ${monthLabel(periodStart)}: ${formatPercent(row.value)} (${row.compare_pct > 0 ? "+" : ""}${row.compare_pct}% ${row.compare_note}).`
        : `Conversion Rate ${monthLabel(periodStart)}: ${formatPercent(row.value)}. Kein Vergleich möglich (${row.compare_note}).`;
      return { text, source: "shopify_monthly (get_shopify_period_kpis)", period: monthLabel(periodStart) };
    },
  },
  {
    id: "dashboard-standorte-entwicklung",
    page: "dashboard",
    question: "Wie hat sich der Umsatz an den Standorten entwickelt?",
    async run(periodStart) {
      const { data, error } = await supabase.rpc("get_location_revenue_kpis", { p_period_start: periodStart });
      if (error || !data?.length) return errAnswer("pos_order_daily", periodStart);
      const lines = data
        .map((r: LocationRpcRow) =>
          r.compare_available
            ? `${r.location_code}: ${formatEUR(r.revenue)} (${(r.compare_pct ?? 0) > 0 ? "+" : ""}${r.compare_pct}% ${r.compare_note})`
            : `${r.location_code}: ${formatEUR(r.revenue)} (${r.compare_note})`
        )
        .join(" · ");
      return { text: `Umsatz pro Standort in ${monthLabel(periodStart)}: ${lines}.`, source: "pos_order_daily (get_location_revenue_kpis)", period: monthLabel(periodStart) };
    },
  },
  {
    id: "dashboard-spitzenreiter",
    page: "dashboard",
    question: "Welcher Standort ist aktuell Spitzenreiter?",
    async run(periodStart) {
      const { data, error } = await supabase.rpc("get_location_revenue_kpis", { p_period_start: periodStart });
      if (error || !data?.length) return errAnswer("pos_order_daily", periodStart);
      const top = [...data].sort((a: LocationRpcRow, b: LocationRpcRow) => (b.revenue ?? 0) - (a.revenue ?? 0))[0];
      return {
        text: `Spitzenreiter in ${monthLabel(periodStart)}: ${top.location_code} mit ${formatEUR(top.revenue)} Umsatz.`,
        source: "pos_order_daily (get_location_revenue_kpis)",
        period: monthLabel(periodStart),
      };
    },
  },
];

function errAnswer(source: string, periodStart: string): ChatAnswer {
  return {
    text: `Dazu konnte ich gerade keine Daten aus ${source} laden. Wahrscheinlich ist der Monat noch nicht vollständig eingetragen, oder die Verbindung ist kurz gestört.`,
    source,
    period: monthLabel(periodStart),
  };
}

export function templatesForPage(page: ChatPage): ChatTemplate[] {
  return CHAT_TEMPLATES.filter((t) => t.page === page);
}

export { periodStartOf };
