"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

// Kleines "ⓘ", das per Klick eine kurze Erklärung einblendet — auch auf
// dem Handy nutzbar (anders als ein reines title-Attribut, das auf
// Touch-Geräten oft nicht funktioniert).
export function InfoTooltip({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <span ref={ref} className={clsx("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Erklärung anzeigen"
        aria-expanded={open}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-ink/10 text-ink/50 text-[10px] font-semibold leading-none hover:bg-ink/20 hover:text-ink/70 transition-colors cursor-pointer"
      >
        i
      </button>
      {open && (
        <span className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1.5 w-56 rounded-lg bg-ink text-cream text-xs leading-snug px-3 py-2 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}
