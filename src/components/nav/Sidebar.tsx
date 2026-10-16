"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";

// Navigation in Bereichen: erst "wo steht das Geschäft" (Übersicht), dann
// die Umsatzquellen, dann Produkte & Kosten, zuletzt Notizen. Die Gruppen-
// titel erscheinen nur am Desktop; auf dem Handy bleibt es eine Leiste.
const NAV_GROUPS = [
  {
    title: "Übersicht",
    items: [{ href: "/dashboard", label: "Dashboard" }],
  },
  {
    title: "Umsatz",
    items: [
      { href: "/erfassen/standorte", label: "Shops" },
      { href: "/erfassen/shopify", label: "Shopify" },
      { href: "/lieferdienste", label: "Lieferdienste" },
      { href: "/erfassen/tgtg", label: "Too Good To Go" },
      { href: "/b2b", label: "B2B" },
      { href: "/erfassen/projekte", label: "Projekte & Pop-ups" },
    ],
  },
  {
    title: "Produkte & Kosten",
    items: [
      { href: "/produkte", label: "Verkäufe" },
      { href: "/wareneinsatz", label: "Wareneinsatz & Marge" },
    ],
  },
  {
    title: "Notizen",
    items: [{ href: "/erfassen/ereignisse", label: "Ereignisse" }],
  },
];

export function Sidebar({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="w-full md:w-60 shrink-0 bg-ink text-cream flex md:flex-col md:min-h-screen">
      <div className="p-5 flex md:flex-col items-center md:items-start justify-between w-full">
        <div>
          <p className="font-heading text-lg text-neon leading-none">Karma Food</p>
          <p className="text-xs text-cream/50 mt-1">Finanzübersicht</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 md:py-4 flex md:flex-col gap-1 md:gap-5 overflow-x-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="flex md:flex-col gap-1">
            <p className="hidden md:block px-3.5 mb-1 text-[11px] font-medium uppercase tracking-wider text-cream/35">
              {group.title}
            </p>
            {group.items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "rounded-xl px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    active
                      ? "bg-neon text-ink"
                      : "text-cream/70 hover:bg-white/10 hover:text-cream",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 hidden md:block">
        <p className="text-sm text-cream/90 truncate">{name || email}</p>
        <p className="text-xs text-cream/40 truncate mb-3">{email}</p>
        <button
          onClick={handleSignOut}
          className="text-xs font-medium text-cream/60 hover:text-orange transition-colors cursor-pointer"
        >
          Abmelden
        </button>
      </div>
    </aside>
  );
}
