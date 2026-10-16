"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import {
  saveProductCost as saveRow,
  deleteProductCost as deleteRow,
  VAT_RATES,
} from "@/lib/wareneinsatz";

export interface ProductCostInput {
  productName: string;
  costNet: number;
  vatRate: number;
  note: string | null;
}

async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    throw new Error("Keine Berechtigung");
  }
}

export async function saveProductCost(input: ProductCostInput) {
  try {
    await requireAdmin();
    const name = input.productName.trim();
    if (!name) throw new Error("Produktname fehlt");
    if (!Number.isFinite(input.costNet) || input.costNet < 0) {
      throw new Error("Wareneinsatz muss eine Zahl ≥ 0 sein");
    }
    if (!(VAT_RATES as readonly number[]).includes(input.vatRate)) {
      throw new Error("Steuersatz ungültig");
    }
    await saveRow({
      productName: name,
      costNet: Math.round(input.costNet * 100) / 100,
      vatRate: input.vatRate,
      note: input.note?.trim() || null,
    });
  } catch (err) {
    return {
      ok: false as const,
      message: err instanceof Error ? err.message : "Unbekannter Fehler",
    };
  }
  revalidatePath("/wareneinsatz");
  return { ok: true as const };
}

export async function deleteProductCost(productName: string) {
  try {
    await requireAdmin();
    await deleteRow(productName);
  } catch (err) {
    return {
      ok: false as const,
      message: err instanceof Error ? err.message : "Unbekannter Fehler",
    };
  }
  revalidatePath("/wareneinsatz");
  return { ok: true as const };
}
