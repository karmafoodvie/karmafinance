import type { QuickLink } from "@/lib/constants";

// Kleine Pill-Links zu externen Portalen (Shopify, Wolt, Foodora, …).
// Öffnen im neuen Tab, damit die eigene Eingabe-Seite nicht verloren geht.
export function QuickLinks({ links }: { links: QuickLink[] }) {
  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => (
        <a
          key={link.key}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-xs font-medium text-ink/70 hover:border-ink/30 hover:text-ink transition-colors"
        >
          {link.label}
          <span aria-hidden className="text-ink/40">
            ↗
          </span>
        </a>
      ))}
    </div>
  );
}
