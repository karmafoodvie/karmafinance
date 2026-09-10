import { createClient } from "@/lib/supabase/server";

// Meal-Kategorien, die einem Tagesgericht zugeordnet werden. Lunch Combo und
// Mix Portion sind bewusst NICHT dabei — die lassen sich nicht auf ein
// einzelnes Gericht aufteilen und werden separat als Topf ausgewiesen.
const ATTRIBUTABLE = ["Curry", "Dal", "Lasagne", "Biryani", "Bowl", "Special", "Wochensalat"];
const UNATTRIBUTABLE = ["Lunch Combo", "Mix Portion"];

// Menü-Ära beginnt am 07.09.2026 (Herbst/Winter). Davor gibt es keinen
// datierten Menükalender → keine Pro-Gericht-Zuordnung möglich.
export const MENU_ERA_START = "2026-09-07";

export interface MealDailyRow {
  location_code: string;
  day_date: string;
  category: string;
  quantity: number | null;
  revenue: number | null;
}
export interface MenuPlanRow {
  day_date: string;
  category: string;
  dish_name: string;
  price: number | null;
}

export interface DishStat {
  dishName: string;
  category: string;
  revenue: number;
  quantity: number;
  daysServed: number;
  avgPerDay: number;
}
export interface AnomalyStat {
  category: string;
  revenue: number;
  quantity: number;
  days: number;
}

async function getMealDaily(
  fromDate: string,
  toDate: string,
  locationCodes?: string[],
): Promise<MealDailyRow[]> {
  const supabase = await createClient();
  const PAGE = 1000;
  const all: MealDailyRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("pos_meal_daily")
      .select("location_code, day_date, category, quantity, revenue")
      .gte("day_date", fromDate)
      .lte("day_date", toDate)
      .order("id")
      .range(from, from + PAGE - 1);
    if (locationCodes && locationCodes.length > 0) q = q.in("location_code", locationCodes);
    const { data, error } = await q;
    if (error) throw error;
    all.push(...(data as MealDailyRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

async function getMenuPlan(fromDate: string, toDate: string): Promise<MenuPlanRow[]> {
  const supabase = await createClient();
  const PAGE = 1000;
  const all: MenuPlanRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("menu_plan")
      .select("day_date, category, dish_name, price")
      .gte("day_date", fromDate)
      .lte("day_date", toDate)
      .order("day_date")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data as MenuPlanRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

export async function buildDishData(
  fromDate: string,
  toDate: string,
  locationCodes?: string[],
) {
  const [mealRows, planRows] = await Promise.all([
    getMealDaily(fromDate, toDate, locationCodes),
    getMenuPlan(fromDate, toDate),
  ]);

  // Menükalender-Lookup: "date|category" -> dish
  const planByKey = new Map<string, MenuPlanRow>();
  for (const p of planRows) planByKey.set(`${p.day_date}|${p.category}`, p);

  const dishAgg = new Map<
    string,
    { category: string; revenue: number; quantity: number; days: Set<string> }
  >();
  const anomalyAgg = new Map<
    string,
    { revenue: number; quantity: number; days: Set<string> }
  >();
  let comboRevenue = 0;
  let comboQty = 0;
  let mixRevenue = 0;
  let mixQty = 0;

  for (const r of mealRows) {
    const rev = Number(r.revenue ?? 0);
    const qty = Number(r.quantity ?? 0);
    if (r.category === "Lunch Combo") {
      comboRevenue += rev;
      comboQty += qty;
      continue;
    }
    if (r.category === "Mix Portion") {
      mixRevenue += rev;
      mixQty += qty;
      continue;
    }
    if (!ATTRIBUTABLE.includes(r.category)) continue;
    const plan = planByKey.get(`${r.day_date}|${r.category}`);
    if (plan) {
      const cur = dishAgg.get(plan.dish_name) ?? {
        category: r.category,
        revenue: 0,
        quantity: 0,
        days: new Set<string>(),
      };
      cur.revenue += rev;
      cur.quantity += qty;
      cur.days.add(r.day_date);
      dishAgg.set(plan.dish_name, cur);
    } else {
      // Verkauf in einer Kategorie, die an dem Tag nicht am Plan stand —
      // meist ein Tippfehler im Kassensystem.
      const cur = anomalyAgg.get(r.category) ?? {
        revenue: 0,
        quantity: 0,
        days: new Set<string>(),
      };
      cur.revenue += rev;
      cur.quantity += qty;
      cur.days.add(r.day_date);
      anomalyAgg.set(r.category, cur);
    }
  }

  const dishes: DishStat[] = Array.from(dishAgg.entries())
    .map(([dishName, v]) => ({
      dishName,
      category: v.category,
      revenue: Math.round(v.revenue * 100) / 100,
      quantity: Math.round(v.quantity),
      daysServed: v.days.size,
      avgPerDay: v.days.size > 0 ? Math.round((v.revenue / v.days.size) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const anomalies: AnomalyStat[] = Array.from(anomalyAgg.entries())
    .map(([category, v]) => ({
      category,
      revenue: Math.round(v.revenue * 100) / 100,
      quantity: Math.round(v.quantity),
      days: v.days.size,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const attributedRevenue = dishes.reduce((s, d) => s + d.revenue, 0);
  const anomalyRevenue = anomalies.reduce((s, a) => s + a.revenue, 0);

  return {
    dishes,
    anomalies,
    totals: {
      attributedRevenue: Math.round(attributedRevenue * 100) / 100,
      dishCount: dishes.length,
      anomalyRevenue: Math.round(anomalyRevenue * 100) / 100,
      comboRevenue: Math.round(comboRevenue * 100) / 100,
      comboQty: Math.round(comboQty),
      mixRevenue: Math.round(mixRevenue * 100) / 100,
      mixQty: Math.round(mixQty),
    },
    hasData: mealRows.length > 0,
    hasPlan: planRows.length > 0,
  };
}
