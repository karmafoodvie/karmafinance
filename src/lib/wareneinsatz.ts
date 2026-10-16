// Wareneinsatz pro Produkt und daraus abgeleitete Marge.
//
// Kosten stehen in public.product_cost (Einkauf/Herstellung je Stück, netto).
// Verkäufe kommen aus product_sales_monthly, Kanal "stores" (Kassa). Die
// Kassa-Umsätze sind BRUTTO inkl. USt, deshalb wird mit dem hinterlegten
// Steuersatz auf netto umgerechnet, bevor die Marge gebildet wird.

import { createClient } from "@/lib/supabase/server";
import { getProductSales } from "@/lib/produkte";

export const VAT_RATES = [10, 13, 20, 0] as const;

export interface ProductCostRow {
  product_name: string;
  cost_net: number;
  vat_rate: number;
  note: string | null;
  updated_at: string;
}

export interface MarginRow {
  product: string;
  quantity: number;
  revenueGross: number;
  /** Ø Verkaufspreis brutto je Stück */
  avgPriceGross: number | null;
  cost: ProductCostRow | null;
  /** Ø Verkaufspreis netto je Stück (nur mit Steuersatz) */
  avgPriceNet: number | null;
  /** Rohertrag je Stück (netto minus Wareneinsatz) */
  marginPerUnit: number | null;
  /** Rohertrag in % vom Netto-Verkaufspreis */
  marginPct: number | null;
  /** Rohertrag gesamt im Zeitraum */
  marginTotal: number | null;
}

export async function getProductCosts(): Promise<{
  rows: ProductCostRow[];
  missingTable: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_cost")
    .select("product_name, cost_net, vat_rate, note, updated_at")
    .order("product_name");
  if (error) {
    // 42P01 = Tabelle existiert noch nicht (Migration nicht eingespielt)
    if (error.code === "42P01" || error.code === "PGRST205") {
      return { rows: [], missingTable: true };
    }
    throw error;
  }
  return {
    rows: (data ?? []).map((r) => ({
      ...r,
      cost_net: Number(r.cost_net),
      vat_rate: Number(r.vat_rate),
    })) as ProductCostRow[],
    missingTable: false,
  };
}

export async function saveProductCost(input: {
  productName: string;
  costNet: number;
  vatRate: number;
  note: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht eingeloggt");
  const { error } = await supabase.from("product_cost").upsert(
    {
      product_name: input.productName,
      cost_net: input.costNet,
      vat_rate: input.vatRate,
      note: input.note,
      updated_by: user.id,
    },
    { onConflict: "product_name" },
  );
  if (error) throw error;
}

export async function deleteProductCost(productName: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("product_cost")
    .delete()
    .eq("product_name", productName);
  if (error) throw error;
}

/**
 * Verkäufe der Stores im Zeitraum, je Produkt, mit Wareneinsatz und Marge
 * (sofern ein Wareneinsatz hinterlegt ist). Sortiert nach Umsatz.
 */
export async function buildMarginRows(
  fromPeriod: string,
  toPeriod: string,
  costs: ProductCostRow[],
): Promise<MarginRow[]> {
  const sales = await getProductSales(fromPeriod, toPeriod);
  const byProduct = new Map<string, { quantity: number; revenue: number }>();
  for (const s of sales) {
    if (s.channel !== "stores") continue;
    const cur = byProduct.get(s.product_name) ?? { quantity: 0, revenue: 0 };
    cur.quantity += s.quantity ?? 0;
    cur.revenue += s.revenue ?? 0;
    byProduct.set(s.product_name, cur);
  }
  const costByName = new Map(costs.map((c) => [c.product_name, c]));

  const rows: MarginRow[] = [];
  for (const [product, v] of byProduct) {
    // Rabattzeilen und Zeilen ohne Stück liefern keine sinnvolle Marge.
    if (v.quantity <= 0 || v.revenue <= 0) continue;
    const cost = costByName.get(product) ?? null;
    const avgPriceGross = v.revenue / v.quantity;
    let avgPriceNet: number | null = null;
    let marginPerUnit: number | null = null;
    let marginPct: number | null = null;
    let marginTotal: number | null = null;
    if (cost) {
      avgPriceNet = avgPriceGross / (1 + cost.vat_rate / 100);
      marginPerUnit = avgPriceNet - cost.cost_net;
      marginPct = avgPriceNet > 0 ? (marginPerUnit / avgPriceNet) * 100 : null;
      marginTotal = marginPerUnit * v.quantity;
    }
    rows.push({
      product,
      quantity: v.quantity,
      revenueGross: v.revenue,
      avgPriceGross,
      cost,
      avgPriceNet,
      marginPerUnit,
      marginPct,
      marginTotal,
    });
  }
  rows.sort((a, b) => b.revenueGross - a.revenueGross);
  return rows;
}
