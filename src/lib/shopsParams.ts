import { endOfMonth, format } from "date-fns";
import { ACTIVE_LOCATIONS, LOCATIONS, periodStart, monthLabel } from "@/lib/constants";

export interface ShopsSearchParams {
  fromYear?: string;
  fromMonth?: string;
  toYear?: string;
  toMonth?: string;
  locs?: string;
  /** "1" = archivierte (geschlossene) Shops mit auswerten */
  archiv?: string;
}

/**
 * Gemeinsame Auswertung der Filter für alle Shops-Reiter. Standard ist das
 * laufende Jahr (Jänner bis aktueller Monat) — gleiche Logik wie in der
 * Filterleiste (ShopsNav), damit Anzeige und Daten zusammenpassen.
 */
export function resolveShopsParams(params: ShopsSearchParams) {
  const now = new Date();
  const fromYear = Number(params.fromYear) || now.getFullYear();
  const fromMonth = Number(params.fromMonth) || 1;
  const toYear = Number(params.toYear) || now.getFullYear();
  const toMonth = Number(params.toMonth) || now.getMonth() + 1;

  let fromPeriod = periodStart(fromYear, fromMonth);
  let toPeriod = periodStart(toYear, toMonth);
  if (fromPeriod > toPeriod) [fromPeriod, toPeriod] = [toPeriod, fromPeriod];

  const fromDate = fromPeriod;
  const toDate = format(endOfMonth(new Date(toPeriod)), "yyyy-MM-dd");

  // Geschlossene Shops (z.B. Neustiftgasse) sind archiviert: sie stehen nur
  // zur Auswahl und in den Zahlen, wenn "Archiv" eingeschaltet ist.
  const includeArchive = params.archiv === "1";
  const poolLocations = includeArchive ? LOCATIONS : ACTIVE_LOCATIONS;
  const allCodes = poolLocations.map((l) => l.code);
  const selected = (params.locs ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((c) => allCodes.includes(c as (typeof allCodes)[number]));
  const activeLocations = selected.length > 0 ? selected : allCodes;
  const allSelected = activeLocations.length === allCodes.length;

  const [fy, fm] = fromPeriod.split("-").map(Number);
  const [ty, tm] = toPeriod.split("-").map(Number);
  const rangeLabel = `${monthLabel(fm)} ${fy} – ${monthLabel(tm)} ${ty}`;

  return {
    fromYear,
    fromMonth,
    toYear,
    toMonth,
    fromPeriod,
    toPeriod,
    fromDate,
    toDate,
    activeLocations,
    allSelected,
    includeArchive,
    poolLocations,
    // ohne Archiv immer explizit filtern, sonst kämen archivierte Shops über "alle" doch mit
    locationFilter: allSelected && includeArchive ? undefined : activeLocations,
    rangeLabel,
  };
}
