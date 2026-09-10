"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format, subMonths } from "date-fns";
import { MONTH_NAMES, SELECTABLE_YEARS } from "@/lib/constants";
import { Select } from "@/components/ui/Select";

interface Props {
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
}

const presetButtonClass =
  "rounded-full border border-ink/15 px-2.5 py-1 text-xs text-ink/60 hover:border-ink/30 hover:text-ink transition-colors";

export function DateRangePicker({ fromYear, fromMonth, toYear, toMonth }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function push(fy: number, fm: number, ty: number, tm: number) {
    // Bestehende Filter (Shop-Auswahl, Überkategorie, ...) mitnehmen, statt
    // die URL neu zu bauen — sonst fällt beim Zeitraumwechsel die
    // Shop-Auswahl weg.
    const params = new URLSearchParams(searchParams.toString());
    params.set("fromYear", String(fy));
    params.set("fromMonth", String(fm));
    params.set("toYear", String(ty));
    params.set("toMonth", String(tm));
    router.push(`${pathname}?${params.toString()}`);
    // Next.js cacht Server-Component-Seiten client-seitig kurz (Router
    // Cache) — ohne refresh() zeigt die Seite nach einer Zeitraum-Änderung
    // manchmal noch die alten Zahlen, bis der Cache von selbst abläuft.
    // refresh() erzwingt sofort einen frischen Datenabruf vom Server.
    router.refresh();
  }

  function preset(months: number | "ytd" | "all") {
    const now = new Date();
    if (months === "ytd") {
      push(now.getFullYear(), 1, now.getFullYear(), now.getMonth() + 1);
      return;
    }
    if (months === "all") {
      push(2022, 1, now.getFullYear(), now.getMonth() + 1);
      return;
    }
    const start = subMonths(now, months - 1);
    push(
      Number(format(start, "yyyy")),
      Number(format(start, "M")),
      now.getFullYear(),
      now.getMonth() + 1,
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-ink/40">von</span>
        <Select
          aria-label="Von Monat"
          value={fromMonth}
          onChange={(e) => push(fromYear, Number(e.target.value), toYear, toMonth)}
          className="w-auto"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Von Jahr"
          value={fromYear}
          onChange={(e) => push(Number(e.target.value), fromMonth, toYear, toMonth)}
          className="w-auto"
        >
          {SELECTABLE_YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-ink/40">bis</span>
        <Select
          aria-label="Bis Monat"
          value={toMonth}
          onChange={(e) => push(fromYear, fromMonth, toYear, Number(e.target.value))}
          className="w-auto"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Bis Jahr"
          value={toYear}
          onChange={(e) => push(fromYear, fromMonth, Number(e.target.value), toMonth)}
          className="w-auto"
        >
          {SELECTABLE_YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center gap-1.5 ml-1">
        <button type="button" onClick={() => preset(12)} className={presetButtonClass}>
          12 Monate
        </button>
        <button type="button" onClick={() => preset(24)} className={presetButtonClass}>
          24 Monate
        </button>
        <button type="button" onClick={() => preset("ytd")} className={presetButtonClass}>
          Dieses Jahr
        </button>
        <button type="button" onClick={() => preset("all")} className={presetButtonClass}>
          Alles
        </button>
      </div>
    </div>
  );
}
