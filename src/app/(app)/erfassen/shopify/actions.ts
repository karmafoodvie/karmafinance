"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ShopifyMonthlyInput {
  periodStart: string;
  payoutAmount: number | null;
  ordersCount: number | null;
  conversionRate: number | null;
  sessions: number | null;
  payoutPrevYearManual: number | null;
}

export async function saveShopifyMonthly(input: ShopifyMonthlyInput) {
  const supabase = await createClient();

  const { error } = await supabase.from("shopify_monthly").upsert(
    {
      period_start: input.periodStart,
      period_type: "monthly",
      payout_amount: input.payoutAmount,
      orders_count: input.ordersCount,
      conversion_rate: input.conversionRate,
      sessions: input.sessions,
      payout_prev_year_manual: input.payoutPrevYearManual,
    },
    { onConflict: "period_start,period_type" },
  );

  if (error) {
    return { ok: false as const, message: error.message };
  }

  revalidatePath("/erfassen/shopify");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
