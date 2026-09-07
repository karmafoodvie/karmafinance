"use client";

import { useRouter, usePathname } from "next/navigation";
import { MONTH_NAMES, SELECTABLE_YEARS } from "@/lib/constants";
import { Select } from "@/components/ui/Select";

export function PeriodPicker({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const pathname = usePathname();

  function update(nextYear: number, nextMonth: number) {
    router.push(`${pathname}?year=${nextYear}&month=${nextMonth}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label="Monat"
        value={month}
        onChange={(e) => update(year, Number(e.target.value))}
        className="w-auto"
      >
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Jahr"
        value={year}
        onChange={(e) => update(Number(e.target.value), month)}
        className="w-auto"
      >
        {SELECTABLE_YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  );
}
