"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface TgtgMonthInput {
  periodStart: string;
  payouts: {
    locationCode: string;
    mealsSaved: number | null;
    revenueGross: number | null;
    feeAmount: number | null;
    revenueNet: number | null;
  }[];
}

export async function saveTgtgMonth(input: TgtgMonthInput) {
  const supabase = await createClient();

  const rows = input.payouts.map((p) => ({
    location_code: p.locationCode,
    period_start: input.periodStart,
    period_type: "monthly" as const,
    meals_saved: p.mealsSaved,
    revenue_gross: p.revenueGross,
    fee_amount: p.feeAmount,
    revenue_net: p.revenueNet,
  }));

  const { error } = await supabase
    .from("tgtg_location_payout")
    .upsert(rows, { onConflict: "location_code,period_start,period_type" });

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/erfassen/tgtg");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
