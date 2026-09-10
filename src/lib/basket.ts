import { createClient } from "@/lib/supabase/server";
import { monthsInRange, type DateRange } from "@/lib/dashboard";
import { getPosProducts, getProductGroupMap } from "@/lib/products";
import { LOCATIONS } from "@/lib/constants";

// Produkte, die als Verpackung/To-Go-Indikator dienen. Kein exakter
// Take-away-Anteil (nicht jede Mitnahme braucht ein Sackerl), aber der
// einzige harte Datenpunkt in die Richtung, den die Kassa hergibt.
const TAKEAWAY_PRODUCTS = ["Papiersackerl", "Karma Dabba"];

const WEEKDAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export interface OrderDailyRow {
  location_code: string;
  day_date: string;
  orders: number | null;
  revenue: number | null;
  items: number | null;
}

export interface StoreBasketStat {
  code: string;
  shortName: string;
  orders: number;
  revenue: number;
  items: number;
  openDays: number;
  avgBasket: number;
  itemsPerOrder: number;
  ordersPerDay: number;
  comboRate: number | null;
  discountTotal: number;
  takeawayRate: number | null;
}

export interface TrendPoint {
  label: string;
  [store: string]: string | number;
}

export interface TopProduct {
  productName: string;
  revenue: number;
  quantity: number;
}

export interface StoreTopList {
  shortName: string;
  products: TopProduct[];
}

export interface ProductByStore {
  shortName: string;
  revenue: number;
  quantity: number;
}

export interface DiscountByStore {
  shortName: string;
  total: number;
  share: number; // Anteil am Umsatz des Standorts
  top: { name: string; amount: number }[];
}

async function getOrderDaily(
  fromDate: string,
  toDate: string,
  locationCodes?: string[],
): Promise<OrderDailyRow[]> {
  const supabase = await createClient();
  const PAGE = 1000;
  const all: OrderDailyRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("pos_order_daily")
      .select("location_code, day_date, orders, revenue, items")
      .gte("day_date", fromDate)
      .lte("day_date", toDate)
      .order("id")
      .range(from, from + PAGE - 1);
    if (locationCodes && locationCodes.length > 0) q = q.in("location_code", locationCodes);
    const { data, error } = await q;
    if (error) throw error;
    all.push(...(data as OrderDailyRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

async function getComboDaily(
  fromDate: string,
  toDate: string,
  locationCodes?: string[],
): Promise<{ location_code: string; quantity: number | null }[]> {
  const supabase = await createClient();
  const PAGE = 1000;
  const all: { location_code: string; quantity: number | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("pos_meal_daily")
      .select("location_code, quantity")
      .eq("category", "Lunch Combo")
      .gte("day_date", fromDate)
      .lte("day_date", toDate)
      .order("id")
      .range(from, from + PAGE - 1);
    if (locationCodes && locationCodes.length > 0) q = q.in("location_code", locationCodes);
    const { data, error } = await q;
    if (error) throw error;
    all.push(...(data as { location_code: string; quantity: number | null }[]));
    if (data.length < PAGE) break;
  }
  return all;
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

/**
 * Warenkorb-, Upselling- und Standortvergleichsdaten.
 *
 * Warum eine eigene Tabelle (pos_order_daily) und nicht die Produktdaten:
 * eine Bestellung mit drei Artikeln steht in den Produktdaten dreimal drin.
 * Für "Umsatz pro Bestellung" braucht es die Bestellanzahl (Odoo: "Auftrag"),
 * und die gibt es nur auf Tages-/Standortebene.
 */
export async function buildBasketData(
  range: DateRange,
  fromDate: string,
  toDate: string,
  locationCodes?: string[],
  compareProduct?: string,
) {
  const months = monthsInRange(range.from, range.to);
  const [orderRows, comboRows, productRows, groupMap] = await Promise.all([
    getOrderDaily(fromDate, toDate, locationCodes),
    getComboDaily(fromDate, toDate, locationCodes),
    getPosProducts(range.from, range.to, locationCodes),
    getProductGroupMap(),
  ]);

  const codeToShort = new Map<string, string>(LOCATIONS.map((l) => [l.code, l.shortName]));

  // --- Kennzahlen je Standort -------------------------------------------
  const agg = new Map<
    string,
    { orders: number; revenue: number; items: number; days: Set<string> }
  >();
  for (const r of orderRows) {
    const cur = agg.get(r.location_code) ?? {
      orders: 0,
      revenue: 0,
      items: 0,
      days: new Set<string>(),
    };
    cur.orders += Number(r.orders ?? 0);
    cur.revenue += Number(r.revenue ?? 0);
    cur.items += Number(r.items ?? 0);
    cur.days.add(r.day_date);
    agg.set(r.location_code, cur);
  }

  const comboByStore = new Map<string, number>();
  for (const r of comboRows) {
    comboByStore.set(
      r.location_code,
      (comboByStore.get(r.location_code) ?? 0) + Number(r.quantity ?? 0),
    );
  }

  // Rabatte und Verpackung je Standort aus den Produktdaten.
  const discountByStore = new Map<string, number>();
  const discountDetail = new Map<string, Map<string, number>>();
  const takeawayByStore = new Map<string, number>();
  const productRevByStore = new Map<string, Map<string, { revenue: number; quantity: number }>>();
  for (const r of productRows) {
    const g = groupMap.get(r.product_name)?.group ?? "Andere";
    const rev = Number(r.revenue ?? 0);
    const qty = Number(r.quantity ?? 0);
    if (g === "Rabatte & Sonstiges" && rev < 0) {
      discountByStore.set(r.location_code, (discountByStore.get(r.location_code) ?? 0) + rev);
      const detail = discountDetail.get(r.location_code) ?? new Map<string, number>();
      detail.set(r.product_name, (detail.get(r.product_name) ?? 0) + rev);
      discountDetail.set(r.location_code, detail);
    }
    if (TAKEAWAY_PRODUCTS.includes(r.product_name)) {
      takeawayByStore.set(r.location_code, (takeawayByStore.get(r.location_code) ?? 0) + qty);
    }
    // Top-Produkte: Rabatt-/Gutscheinzeilen raus, das sind keine Produkte.
    if (g !== "Rabatte & Sonstiges") {
      const perStore = productRevByStore.get(r.location_code) ?? new Map();
      const cur = perStore.get(r.product_name) ?? { revenue: 0, quantity: 0 };
      cur.revenue += rev;
      cur.quantity += qty;
      perStore.set(r.product_name, cur);
      productRevByStore.set(r.location_code, perStore);
    }
  }

  const stores: StoreBasketStat[] = LOCATIONS.filter((l) => agg.has(l.code))
    .map((l) => {
      const a = agg.get(l.code)!;
      const combo = comboByStore.get(l.code);
      const takeaway = takeawayByStore.get(l.code);
      return {
        code: l.code,
        shortName: l.shortName,
        orders: a.orders,
        revenue: round2(a.revenue),
        items: a.items,
        openDays: a.days.size,
        avgBasket: a.orders > 0 ? round2(a.revenue / a.orders) : 0,
        itemsPerOrder: a.orders > 0 ? Math.round((a.items / a.orders) * 100) / 100 : 0,
        ordersPerDay: a.days.size > 0 ? Math.round((a.orders / a.days.size) * 10) / 10 : 0,
        comboRate: combo != null && a.orders > 0 ? round2((combo / a.orders) * 100) : null,
        discountTotal: round2(Math.abs(discountByStore.get(l.code) ?? 0)),
        takeawayRate:
          takeaway != null && a.orders > 0 ? round2((takeaway / a.orders) * 100) : null,
      };
    })
    .sort((a, b) => b.avgBasket - a.avgBasket);

  const totalOrders = stores.reduce((s, x) => s + x.orders, 0);
  const totalRevenue = stores.reduce((s, x) => s + x.revenue, 0);
  const totalItems = stores.reduce((s, x) => s + x.items, 0);
  const totalCombo = Array.from(comboByStore.values()).reduce((s, x) => s + x, 0);
  const totalDiscount = stores.reduce((s, x) => s + x.discountTotal, 0);
  // Gesamt-Offene-Tage: Summe aller Standorttage (nicht unique-Kalendertage,
  // weil jeder Standort eigene Öffnungstage hat → ergibt den "Pro-Standort-Schnitt")
  const totalOpenDays = stores.reduce((s, x) => s + x.openDays, 0);

  // --- Monatsverlauf je Standort ----------------------------------------
  const monthAgg = new Map<string, { orders: number; revenue: number; items: number }>();
  for (const r of orderRows) {
    const period = `${r.day_date.slice(0, 7)}-01`;
    const short = codeToShort.get(r.location_code);
    if (!short) continue;
    const key = `${short}|${period}`;
    const cur = monthAgg.get(key) ?? { orders: 0, revenue: 0, items: 0 };
    cur.orders += Number(r.orders ?? 0);
    cur.revenue += Number(r.revenue ?? 0);
    cur.items += Number(r.items ?? 0);
    monthAgg.set(key, cur);
  }
  const storeKeys = stores.map((s) => s.shortName);

  function buildTrend(metric: "basket" | "orders" | "items"): TrendPoint[] {
    return months.map((m) => {
      const point: TrendPoint = { label: m.label };
      for (const store of storeKeys) {
        const v = monthAgg.get(`${store}|${m.periodStart}`);
        if (!v || v.orders === 0) {
          point[store] = 0;
          continue;
        }
        point[store] =
          metric === "basket"
            ? round2(v.revenue / v.orders)
            : metric === "items"
              ? Math.round((v.items / v.orders) * 100) / 100
              : v.orders;
      }
      return point;
    });
  }

  // --- Wochentagsmuster --------------------------------------------------
  const weekdayAgg = new Map<number, { orders: number; revenue: number }>();
  for (const r of orderRows) {
    const wd = new Date(`${r.day_date}T12:00:00Z`).getUTCDay();
    const cur = weekdayAgg.get(wd) ?? { orders: 0, revenue: 0 };
    cur.orders += Number(r.orders ?? 0);
    cur.revenue += Number(r.revenue ?? 0);
    weekdayAgg.set(wd, cur);
  }
  const weekdays = [1, 2, 3, 4, 5, 6, 0]
    .map((wd) => {
      const v = weekdayAgg.get(wd) ?? { orders: 0, revenue: 0 };
      return {
        label: WEEKDAY_LABELS[wd],
        orders: Math.round(v.orders),
        avgBasket: v.orders > 0 ? round2(v.revenue / v.orders) : 0,
      };
    })
    .filter((d) => d.orders > 0);

  // --- Top-Produkte je Standort -----------------------------------------
  const topByStore: StoreTopList[] = stores.map((s) => {
    const perStore = productRevByStore.get(s.code);
    const products = perStore
      ? Array.from(perStore.entries())
          .map(([productName, v]) => ({
            productName,
            revenue: round2(v.revenue),
            quantity: Math.round(v.quantity),
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      : [];
    return { shortName: s.shortName, products };
  });

  // --- Produkt-Vergleich zwischen Standorten -----------------------------
  const productTotals = new Map<string, number>();
  for (const [, perStore] of productRevByStore) {
    for (const [name, v] of perStore) {
      productTotals.set(name, (productTotals.get(name) ?? 0) + v.revenue);
    }
  }
  const selectableProducts = Array.from(productTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80)
    .map(([name]) => name);

  const activeProduct =
    compareProduct && productTotals.has(compareProduct)
      ? compareProduct
      : (selectableProducts.find((p) => p.toLowerCase().includes("lassi")) ??
        selectableProducts[0] ??
        "");

  const productByStore: ProductByStore[] = stores.map((s) => {
    const v = productRevByStore.get(s.code)?.get(activeProduct);
    return {
      shortName: s.shortName,
      revenue: v ? round2(v.revenue) : 0,
      quantity: v ? Math.round(v.quantity) : 0,
    };
  });

  // --- Rabatte je Standort ----------------------------------------------
  const discounts: DiscountByStore[] = stores.map((s) => {
    const detail = discountDetail.get(s.code);
    const top = detail
      ? Array.from(detail.entries())
          .map(([name, amount]) => ({ name, amount: round2(Math.abs(amount)) }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3)
      : [];
    return {
      shortName: s.shortName,
      total: s.discountTotal,
      share: s.revenue > 0 ? round2((s.discountTotal / (s.revenue + s.discountTotal)) * 100) : 0,
      top,
    };
  });

  return {
    stores,
    storeKeys,
    totals: {
      orders: Math.round(totalOrders),
      revenue: round2(totalRevenue),
      items: Math.round(totalItems),
      avgBasket: totalOrders > 0 ? round2(totalRevenue / totalOrders) : 0,
      itemsPerOrder:
        totalOrders > 0 ? Math.round((totalItems / totalOrders) * 100) / 100 : 0,
      comboRate: totalOrders > 0 ? round2((totalCombo / totalOrders) * 100) : 0,
      discountTotal: round2(totalDiscount),
      // Ø Bestellungen/Tag über alle Standorte (= Besucheranzahl-Proxy)
      ordersPerDay: totalOpenDays > 0 ? round2(totalOrders / totalOpenDays) : 0,
      openDays: totalOpenDays,
    },
    basketTrend: buildTrend("basket"),
    ordersTrend: buildTrend("orders"),
    itemsTrend: buildTrend("items"),
    weekdays,
    topByStore,
    selectableProducts,
    activeProduct,
    productByStore,
    discounts,
    hasData: orderRows.length > 0,
  };
}
