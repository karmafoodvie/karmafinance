"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";

// Die Breiten sitzen auf Wrapper-Divs statt als className auf Input/Select:
// beide bringen intern w-full mit, und ob ein w-56 daneben gewinnt, hängt an
// der Reihenfolge im generierten Tailwind-CSS — der Wrapper ist eindeutig.
export function ProduktFilter({
  query,
  group,
  groups,
}: {
  query: string;
  group: string;
  groups: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [text, setText] = useState(query);
  const [isPending, startTransition] = useTransition();

  // Sucheingabe entprellen, damit nicht jeder Tastendruck eine
  // Server-Component-Abfrage auslöst.
  useEffect(() => {
    if (text === query) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (text.trim()) params.set("q", text.trim());
      else params.delete("q");
      params.delete("produkt");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    }, 350);
    return () => clearTimeout(t);
  }, [text, query, pathname, router, searchParams]);

  function setGroup(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("gruppe", value);
    else params.delete("gruppe");
    params.delete("produkt");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-full sm:w-64">
        <Input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Produkt suchen, z.B. Chili Crisp"
          aria-label="Produkt suchen"
        />
      </div>
      <div className="w-full sm:w-52">
        <Select
          aria-label="Produktgruppe"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          <option value="">Alle Gruppen</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </div>
      {isPending && <span className="text-xs text-ink/35">lädt…</span>}
    </div>
  );
}
