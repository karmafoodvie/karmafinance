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
