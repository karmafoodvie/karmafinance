"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface WoltMonthInput {
  periodStart: string;
  payouts: { locationCode: string; payoutAmount: number | null }[];
}

export async function saveWoltMonth(input: WoltMonthInput) {
  const supabase = await createClient();

  const rows = input.payouts.map((p) => ({
    location_code: p.locationCode,
    period_start: input.periodStart,
    period_type: "monthly" as const,
    payout_amount: p.payoutAmount,
  }));

  const { error } = await supabase
    .from("wolt_location_payout")
    .upsert(rows, { onConflict: "location_code,period_start,period_type" });

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/erfassen/lieferdienste");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export interface FoodoraMonthInput {
  periodStart: string;
  grossSales: number | null;
  commissionPct: number | null;
  commissionAmount: number | null;
  payoutTotal: number | null;
  ordersCount: number | null;
  payouts: { locationCode: string; payoutAmount: number | null }[];
}

export async function saveFoodoraMonth(input: FoodoraMonthInput) {
  const supabase = await createClient();

  const { error: monthlyError } = await supabase.from("foodora_monthly").upsert(
    {
      period_start: input.periodStart,
      period_type: "monthly",
      gross_sales: input.grossSales,
      commission_pct: input.commissionPct,
      commission_amount: input.commissionAmount,
      payout_total: input.payoutTotal,
      orders_count: input.ordersCount,
    },
    { onConflict: "period_start,period_type" },
  );

  if (monthlyError) return { ok: false as const, message: monthlyError.message };

  const rows = input.payouts.map((p) => ({
    location_code: p.locationCode,
    period_start: input.periodStart,
    period_type: "monthly" as const,
    payout_amount: p.payoutAmount,
  }));

  const { error: payoutError } = await supabase
    .from("foodora_location_payout")
    .upsert(rows, { onConflict: "location_code,period_start,period_type" });

  if (payoutError) return { ok: false as const, message: payoutError.message };

  revalidatePath("/erfassen/lieferdienste");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
