"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface LocationMonthlyInput {
  locationCode: string;
  periodStart: string;
  revenueNet: number | null;
  discountsTotal: number | null;
  revenuePrevYearManual: number | null;
  note: string | null;
}

export async function saveLocationMonthly(input: LocationMonthlyInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("location_monthly").upsert(
    {
      location_code: input.locationCode,
      period_start: input.periodStart,
      period_type: "monthly",
      revenue_net: input.revenueNet,
      discounts_total: input.discountsTotal,
      revenue_prev_year_manual: input.revenuePrevYearManual,
      note: input.note,
      created_by: user?.id,
    },
    { onConflict: "location_code,period_start,period_type" },
  );

  if (error) {
    return { ok: false as const, message: error.message };
  }

  revalidatePath("/erfassen/standorte");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
