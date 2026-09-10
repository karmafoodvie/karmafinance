"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function LieferdiensteTabs() {
  const pathname = usePathname();
  const isUebersicht = pathname.includes("uebersicht");

  const tabs = [
    { label: "Übersicht", href: "/erfassen/lieferdienste/uebersicht" },
    { label: "Erfassen", href: "/erfassen/lieferdienste" },
  ];

  return (
    <div className="flex gap-1 bg-ink/5 rounded-xl p-1">
      {tabs.map((tab) => {
        const active = tab.href.includes("uebersicht") ? isUebersicht : !isUebersicht;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-white text-ink shadow-sm"
                : "text-ink/50 hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
