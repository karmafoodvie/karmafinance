import { createClient } from "@/lib/supabase/server";
import type {
  LocationRow,
  LocationMonthly,
  ShopifyMonthly,
  WoltLocationPayout,
  FoodoraMonthly,
  FoodoraLocationPayout,
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
