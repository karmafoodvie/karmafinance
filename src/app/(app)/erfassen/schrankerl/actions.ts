"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SchrankelrMonthInput {
  periodStart: string;
  unitsSold: number | null;
  revenueGross: number | null;
  payoutAmount: number | null;
}

export async function saveSchrankelrMonth(input: SchrankelrMonthInput) {
  const supabase = await createClient();

  const { error } = await supabase.from("schrankerl_monthly").upsert(
    {
      period_start: input.periodStart,
      period_type: "monthly",
      units_sold: input.unitsSold,
      revenue_gross: input.revenueGross,
      payout_amount: input.payoutAmount,
    },
    { onConflict: "period_start,period_type" },
  );

  if (error) return { ok: false as const, message: error.message };
  revalidatePath("/erfassen/schrankerl");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
