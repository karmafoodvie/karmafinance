// Zentrale Stammdaten der App. Standorte hier == Standorte in der DB
// (supabase/migrations/0001_init.sql seedet exakt diese Codes).
// Neuer Standort dazu? Hier UND in der Migration ergänzen.

export type LocationCode =
  | "boerse-1010"
  | "lb-1010"
  | "ausstellungsstrasse-1020"
  | "stadtplatz-3400"
  | "inkustrasse-3400"
  | "neustiftgasse-1070";

export interface LocationDef {
  code: LocationCode;
  name: string;
  shortName: string;
  active: boolean; // false = historisch, nur lesend/Referenz
  hasWolt: boolean;
  hasFoodora: boolean;
}

export const LOCATIONS: LocationDef[] = [
  {
    code: "boerse-1010",
    name: "Börse (1010)",
    shortName: "Börse",
    active: true,
    hasWolt: true,
    hasFoodora: true,
  },
  {
    code: "lb-1010",
    name: "Laurenzerberg (1010)",
    shortName: "Laurenzerberg",
    active: true,
    hasWolt: true,
    hasFoodora: true,
  },
  {
    code: "ausstellungsstrasse-1020",
    name: "Ausstellungsstraße (1020)",
    shortName: "Ausstellungsstraße",
    active: true,
    hasWolt: true,
    hasFoodora: true,
  },
  {
    code: "stadtplatz-3400",
    name: "Stadtplatz (3400, Klosterneuburg)",
    shortName: "Stadtplatz",
    active: true,
    hasWolt: true,
    hasFoodora: true,
  },
  {
    code: "inkustrasse-3400",
    name: "Inkustraße (3400, Klosterneuburg)",
    shortName: "Inkustraße",
    active: true,
    hasWolt: true,
    hasFoodora: true,
  },
  {
    code: "neustiftgasse-1070",
    name: "Neustiftgasse (1070) — historisch",
    shortName: "Neustiftgasse",
    active: false,
    hasWolt: true,
    hasFoodora: true,
  },
];

export const ACTIVE_LOCATIONS = LOCATIONS.filter((l) => l.active);

export const MONTH_NAMES = [
  "Jänner",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

export function monthLabel(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

export function periodStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export const CURRENT_YEAR = new Date().getFullYear();

export const SELECTABLE_YEARS = Array.from(
  { length: 6 },
  (_, i) => CURRENT_YEAR - 3 + i,
);

// Direktlinks zu den Portalen, aus denen die Zahlen kommen (aus der
// alten Excel übernommen). Rein zur Bequemlichkeit beim manuellen
// Eintragen — keine Automatisierung, nur ein Klick statt Suchen.
export interface QuickLink {
  key: string;
  label: string;
  url: string;
}

export const QUICK_LINKS: QuickLink[] = [
  {
    key: "shopify",
    label: "Shopify Finance",
    url: "https://admin.shopify.com/store/karmafood/finance",
  },
  {
    key: "wolt",
    label: "Wolt Payout-Reports",
    url: "https://merchant.wolt.com/experience/merchant/66a381394547992aac511931/s/66a381394547992aac511931/payout-reports",
  },
  {
    key: "foodora",
    label: "Foodora Finance",
    url: "https://partner.foodora.com/finance",
  },
  {
    key: "tgtg",
    label: "Too Good To Go — Sales",
    url: "https://store.toogoodtogo.com/chains/2856/sales",
  },
  {
    key: "stadtgemeinde",
    label: "Stadtgemeinde (Sheet)",
    url: "https://docs.google.com/spreadsheets/d/1AgAhS-2u39X5-sP3J8jpxYAJ1GWkjH6-8Q4B2GgBS5o/edit?usp=sharing",
  },
  {
    key: "schrankerl",
    label: "Schrankerl (Sheet)",
    url: "https://docs.google.com/spreadsheets/d/1o5cELMr2_U8ywXtnLTDx04DnWlyIK5nQMwjZtRkj4uU/edit?usp=sharing",
  },
];

export function quickLink(key: string): QuickLink | undefined {
  return QUICK_LINKS.find((l) => l.key === key);
}
