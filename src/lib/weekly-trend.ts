/**
 * Datenlogik für das Wochentrend-Popup.
 *
 * TODO(integration): ersetze diesen Import durch den bestehenden Supabase-Client
 * der App (z.B. `import { supabase } from "@/lib/supabase"`). Der hier erzeugte
 * Client ist nur ein Fallback, damit die Datei für sich funktioniert.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (_client) return _client;
  // TODO(integration): entfernen, sobald der echte App-Client importiert wird.
  _client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return _client;
}

/** Standorte, die in Auswertungen berücksichtigt werden. Neustiftgasse ist seit
 * Juli 2026 geschlossen und wird bewusst ausgeschlossen. */
const ACTIVE_LOCATIONS = [
  "lb-1010",
  "boerse-1010",
  "ausstellungsstrasse-1020",
  "stadtplatz-3400",
  "inkustrasse-3400",
] as const;

export interface WeekPoint {
  /** Montag der ISO-Woche, als YYYY-MM-DD */
  weekStart: string;
  revenue: number;
  orders: number;
  /** Anzahl Handelstage mit Daten in dieser Woche (max. 5, Mo–Fr) */
  tradingDays: number;
}

export interface WeeklyTrendData {
  weeks: WeekPoint[]; // aufsteigend sortiert, älteste zuerst
  current: WeekPoint;
  previous: WeekPoint | null;
  /** Veränderung Umsatz aktuelle vs. Vorwoche in Prozent, null wenn keine Vorwoche */
  deltaPct: number | null;
  /** true, wenn die aktuelle Woche noch nicht vollständig ist (< 5 Handelstage) */
  currentWeekIncomplete: boolean;
}

/**
 * Liefert die letzten `weekCount` Kalenderwochen (Mo–Fr, ISO-Woche) mit
 * aggregiertem Umsatz/Bestellungen über alle aktiven Standorte.
 */
export async function fetchWeeklyTrend(
  weekCount = 8
): Promise<WeeklyTrendData> {
  const supabase = getClient();

  // date_trunc('week', ...) in Postgres beginnt die Woche am Montag (ISO).
  const { data, error } = await supabase.rpc("weekly_revenue_trend", {
    p_locations: ACTIVE_LOCATIONS,
    p_week_count: weekCount,
  });

  if (error) {
    throw new Error(`weekly_revenue_trend fehlgeschlagen: ${error.message}`);
  }

  const weeks: WeekPoint[] = (data ?? []).map((row: any) => ({
    weekStart: row.week_start,
    revenue: Number(row.revenue),
    orders: Number(row.orders),
    tradingDays: Number(row.trading_days),
  }));

  weeks.sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  const current = weeks[weeks.length - 1];
  const previous = weeks.length >= 2 ? weeks[weeks.length - 2] : null;

  const deltaPct =
    previous && previous.revenue > 0
      ? ((current.revenue - previous.revenue) / previous.revenue) * 100
      : null;

  return {
    weeks,
    current,
    previous,
    deltaPct,
    currentWeekIncomplete: current.tradingDays < 5,
  };
}

/**
 * Neuester `updated_at`-Zeitstempel über die POS-Tabellen — dient als
 * "Datenversion", um zu erkennen, ob seit dem letzten Besuch neue Daten
 * eingespielt wurden.
 */
export async function fetchLatestDataVersion(): Promise<string | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("pos_order_daily")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`fetchLatestDataVersion fehlgeschlagen: ${error.message}`);
  }
  return data?.updated_at ?? null;
}
