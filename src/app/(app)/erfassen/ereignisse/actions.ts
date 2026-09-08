"use server";

import { revalidatePath } from "next/cache";
import { saveBusinessEvent as saveBusinessEventRow, deleteBusinessEvent as deleteBusinessEventRow } from "@/lib/data";

export interface BusinessEventInput {
  eventDate: string;
  locationCode: string | null;
  title: string;
  note: string | null;
  tags: string[];
}

export async function saveBusinessEvent(input: BusinessEventInput) {
  try {
    await saveBusinessEventRow(input);
  } catch (err) {
    return {
      ok: false as const,
      message: err instanceof Error ? err.message : "Unbekannter Fehler",
    };
  }
  revalidatePath("/erfassen/ereignisse");
  return { ok: true as const };
}

export async function deleteBusinessEvent(id: string) {
  try {
    await deleteBusinessEventRow(id);
  } catch (err) {
    return {
      ok: false as const,
      message: err instanceof Error ? err.message : "Unbekannter Fehler",
    };
  }
  revalidatePath("/erfassen/ereignisse");
  return { ok: true as const };
}
