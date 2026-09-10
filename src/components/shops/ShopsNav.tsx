"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { LOCATIONS } from "@/lib/constants";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";

const TABS = [
  { href: "/erfassen/standorte", label: "Übersicht" },
  { href: "/erfassen/standorte/warenkorb", label: "Warenkorb" },
  { href: "/erfassen/standorte/produkte", label: "Produkte" },
  { href: "/erfassen/standorte/gerichte", label: "Gerichte" },
];

/**
 * Kopf der Shops-Seite: Unter-Reiter plus die Filter, die für alle Reiter
 * gelten (Zeitraum und Shop-Auswahl). Beides hängt an der URL, damit die
 * Auswahl beim Wechsel des Reiters erhalten bleibt.
 */
export function ShopsNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  const now = new Date();
  const fromYear = Number(searchParams.get("fromYear")) || now.getFullYear();
  const fromMonth = Number(searchParams.get("fromMonth")) || 1;
  const toYear = Number(searchParams.get("toYear")) || now.getFullYear();
  const toMonth = Number(searchParams.get("toMonth")) || now.getMonth() + 1;

  const allCodes = LOCATIONS.map((l) => l.code);
  const selected = (searchParams.get("locs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((c) => allCodes.includes(c as (typeof allCodes)[number]));
  const activeSet = new Set(selected.length > 0 ? selected : allCodes);

  function toggleShop(code: string) {
    const next = new Set(activeSet);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    if (next.size === 0) return; // mindestens ein Shop muss bleiben
    const params = new URLSearchParams(query);
    if (next.size === allCodes.length) params.delete("locs");
    else params.set("locs", allCodes.filter((c) => next.has(c)).join(","));
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  function selectAll() {
    const params = new URLSearchParams(query);
    params.delete("locs");
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  const allSelected = activeSet.size === allCodes.length;

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="font-heading text-xl">Shops</h1>
          <p className="text-sm text-ink/50 mt-1">
            Lunch-Locations — Warenkorb, Produkte und Gerichte im Vergleich
          </p>
        </div>
        <DateRangePicker
          fromYear={fromYear}
          fromMonth={fromMonth}
          toYear={toYear}
          toMonth={toMonth}
        />
      </div>

      {/* Unter-Reiter */}
      <div className="flex flex-wrap gap-1 border-b border-ink/10 mb-4">
        {TABS.map((tab) => {
          const active =
            tab.href === "/erfassen/standorte"
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={query ? `${tab.href}?${query}` : tab.href}
              className={clsx(
                "-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-orange text-ink"
                  : "border-transparent text-ink/45 hover:text-ink/70",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Shop-Filter, gilt für alle Reiter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-ink/40 mr-1">Shops</span>
        <button
          onClick={selectAll}
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
            allSelected ? "bg-ink text-neon" : "bg-ink/5 text-ink/50 hover:bg-ink/10",
          )}
        >
          Alle
        </button>
        {LOCATIONS.map((l) => {
          const on = activeSet.has(l.code);
          return (
            <button
              key={l.code}
              onClick={() => toggleShop(l.code)}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                on
                  ? "bg-ink text-neon"
                  : "bg-ink/5 text-ink/40 hover:bg-ink/10 line-through decoration-1",
              )}
            >
              {l.shortName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
