"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Wolt/Foodora werden nicht mehr manuell erfasst (Import läuft automatisch
// aus den Auszahlungsmails, siehe /lieferdienste bzw. src/lib/lieferdienste.ts).
// saveSchrankelrMonth bleibt hier stehen, weil die alte (im Menü nicht mehr
// verlinkte) Seite src/app/(app)/erfassen/schrankerl/page.tsx noch darauf
// zugreift — Schrankerl-Zahlen selbst kommen inzwischen automatisch importiert
// über /b2b.

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
