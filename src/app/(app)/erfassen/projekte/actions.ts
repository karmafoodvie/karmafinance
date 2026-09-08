"use server";

import { revalidatePath } from "next/cache";
import {
  saveProjectRevenueRow,
  deleteProjectRevenueRow,
} from "@/lib/data";

export interface ProjectRevenueInput {
  projectName: string;
  periodStart: string;
  revenueNet: number | null;
  note: string | null;
}

export async function saveProjectRevenue(input: ProjectRevenueInput) {
  try {
    await saveProjectRevenueRow(input);
  } catch (err) {
    return {
      ok: false as const,
      message: err instanceof Error ? err.message : "Unbekannter Fehler",
    };
  }
  revalidatePath("/erfassen/projekte");
  return { ok: true as const };
}

export async function deleteProjectRevenue(id: string) {
  try {
    await deleteProjectRevenueRow(id);
  } catch (err) {
    return {
      ok: false as const,
      message: err instanceof Error ? err.message : "Unbekannter Fehler",
    };
  }
  revalidatePath("/erfassen/projekte");
  return { ok: true as const };
}
