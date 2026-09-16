"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface B2BMonthInput {
  periodStart: string; // YYYY-MM-01
  values: { channelKey: string; revenueNet: number | null }[];
}

export async function saveB2BMonth(input: B2BMonthInput) {
  const supabase = await createClient();

  const rows = input.values.map((v) => ({
    channel_key: v.channelKey,
    period_start: input.periodStart,
    revenue_net: v.revenueNet,
  }));

  const { error } = await supabase
    .from("b2b_channel_monthly")
    .upsert(rows, { onConflict: "channel_key,period_start" });

  if (error) return { ok: false as const, message: error.message };

  revalidatePath("/b2b");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
