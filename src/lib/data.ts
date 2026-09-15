import { createClient } from "@/lib/supabase/server";
import type {
  LocationRow,
  LocationMonthly,
  ShopifyMonthly,
  WoltLocationPayout,
  FoodoraMonthly,
  FoodoraLocationPayout,
  TgtgLocationPayout,
  SchrankelrMonthly,
  SchrankelrWeeklySummary,
  SchrankelrWeeklyOrder,
  ProjectRevenue,
  BusinessEvent,
} from "@/lib/supabase/types";

export async function getLocations(): Promise<LocationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function getLocationMonthly(
  locationCode: string,
  periodStart: string,
): Promise<LocationMonthly | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("location_monthly")
    .select("*")
    .eq("location_code", locationCode)
    .eq("period_start", periodStart)
    .eq("period_type", "monthly")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLocationMonthlyForPeriod(
  periodStart: string,
): Promise<LocationMonthly[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("location_monthly")
    .select("*")
    .eq("period_start", periodStart)
    .eq("period_type", "monthly");
  if (error) throw error;
  return data;
}

export async function getLocationMonthlySeries(
  fromPeriod: string,
): Promise<LocationMonthly[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("location_monthly")
    .select("*")
    .eq("period_type", "monthly")
    .gte("period_start", fromPeriod)
    .order("period_start");
  if (error) throw error;
  return data;
}

export async function getShopifyMonthly(
  periodStart: string,
): Promise<ShopifyMonthly | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopify_monthly")
    .select("*")
    .eq("period_start", periodStart)
    .eq("period_type", "monthly")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getShopifySeries(fromPeriod: string): Promise<ShopifyMonthly[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopify_monthly")
    .select("*")
    .eq("period_type", "monthly")
    .gte("period_start", fromPeriod)
    .order("period_start");
  if (error) throw error;
  return data;
}

export async function getWoltPayoutsForPeriod(
  periodStart: string,
): Promise<WoltLocationPayout[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wolt_location_payout")
    .select("*")
    .eq("period_start", periodStart)
    .eq("period_type", "monthly");
  if (error) throw error;
  return data;
}

export async function getWoltSeries(fromPeriod: string): Promise<WoltLocationPayout[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wolt_location_payout")
    .select("*")
    .eq("period_type", "monthly")
    .gte("period_start", fromPeriod)
    .order("period_start");
  if (error) throw error;
  return data;
}

export async function getFoodoraMonthly(
  periodStart: string,
): Promise<FoodoraMonthly | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foodora_monthly")
    .select("*")
    .eq("period_start", periodStart)
    .eq("period_type", "monthly")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getFoodoraSeries(fromPeriod: string): Promise<FoodoraMonthly[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foodora_monthly")
    .select("*")
    .eq("period_type", "monthly")
    .gte("period_start", fromPeriod)
    .order("period_start");
  if (error) throw error;
  return data;
}

export async function getFoodoraPayoutsForPeriod(
  periodStart: string,
): Promise<FoodoraLocationPayout[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foodora_location_payout")
    .select("*")
    .eq("period_start", periodStart)
    .eq("period_type", "monthly");
  if (error) throw error;
  return data;
}

export async function getFoodoraPayoutSeries(
  fromPeriod: string,
): Promise<FoodoraLocationPayout[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("foodora_location_payout")
    .select("*")
    .eq("period_type", "monthly")
    .gte("period_start", fromPeriod)
    .order("period_start");
  if (error) throw error;
  return data;
}

export async function getTgtgPayoutsForPeriod(
  periodStart: string,
): Promise<TgtgLocationPayout[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tgtg_location_payout")
    .select("*")
    .eq("period_start", periodStart)
    .eq("period_type", "monthly");
  if (error) throw error;
  return data;
}

export async function getTgtgSeries(fromPeriod: string): Promise<TgtgLocationPayout[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tgtg_location_payout")
    .select("*")
    .eq("period_type", "monthly")
    .gte("period_start", fromPeriod)
    .order("period_start");
  if (error) throw error;
  return data;
}

// Projekte & Pop-ups — freie, unregelmäßige Umsätze (z.B. VDW-Pop-up am
// Standort IST). Absichtlich ohne fromPeriod-Filter: es sind wenige,
// unregelmäßige Einträge, da lohnt sich kein Zeitraum-Ausschnitt.
export async function getProjectRevenue(): Promise<ProjectRevenue[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_revenue")
    .select("*")
    .order("period_start", { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveProjectRevenueRow(input: {
  projectName: string;
  periodStart: string;
  revenueNet: number | null;
  note: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_revenue").upsert(
    {
      project_name: input.projectName,
      period_start: input.periodStart,
      period_type: "monthly" as const,
      revenue_net: input.revenueNet,
      note: input.note,
    },
    { onConflict: "project_name,period_start,period_type" },
  );
  if (error) throw error;
}

export async function deleteProjectRevenueRow(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_revenue").delete().eq("id", id);
  if (error) throw error;
}

// Ereignisse/Notizen — Kontext zu Umsatzschwankungen. Standardmäßig die
// letzten 200 Einträge, neueste zuerst; für diese App mehr als genug.
export async function getBusinessEvents(): Promise<BusinessEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_events")
    .select("*")
    .order("event_date", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

export async function saveBusinessEvent(input: {
  eventDate: string;
  locationCode: string | null;
  title: string;
  note: string | null;
  tags: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("business_events").insert({
    event_date: input.eventDate,
    location_code: input.locationCode,
    title: input.title,
    note: input.note,
    tags: input.tags,
    created_by: user?.id,
  });
  if (error) throw error;
}

export async function deleteBusinessEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("business_events").delete().eq("id", id);
  if (error) throw error;
}

export async function getSchrankelrMonthly(
  periodStart: string,
): Promise<SchrankelrMonthly | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schrankerl_monthly")
    .select("*")
    .eq("period_start", periodStart)
    .eq("period_type", "monthly")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSchrankelrSeries(fromPeriod: string): Promise<SchrankelrMonthly[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schrankerl_monthly")
    .select("*")
    .eq("period_type", "monthly")
    .gte("period_start", fromPeriod)
    .order("period_start");
  if (error) throw error;
  return data;
}

// ── Schrankerl Weekly (auto-importiert via Scheduled Task) ──────────────────

export async function getSchrankelrWeeklyForMonth(
  periodStart: string,
): Promise<{ summaries: SchrankelrWeeklySummary[]; orders: SchrankelrWeeklyOrder[] }> {
  const supabase = await createClient();
  const d = new Date(periodStart);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const monthStart = periodStart; // YYYY-MM-01
  const monthEnd = new Date(year, month + 1, 0).toISOString().split("T")[0]; // last day

  const { data: summaries, error: se } = await supabase
    .from("schrankerl_weekly_summary")
    .select("*")
    .gte("delivery_date", monthStart)
    .lte("delivery_date", monthEnd)
    .order("kw");
  if (se) throw se;

  if (!summaries?.length) return { summaries: [], orders: [] };

  const kws = summaries.map((s) => s.kw);
  const { data: orders, error: oe } = await supabase
    .from("schrankerl_weekly_orders")
    .select("*")
    .in("kw", kws)
    .eq("year", year)
    .order("kw");
  if (oe) throw oe;

  return { summaries: summaries ?? [], orders: orders ?? [] };
}

export async function getSchrankelrWeeklySeries(
  fromYear: number,
  limit = 20,
): Promise<SchrankelrWeeklySummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schrankerl_weekly_summary")
    .select("*")
    .gte("year", fromYear)
    .order("year", { ascending: false })
    .order("kw", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
