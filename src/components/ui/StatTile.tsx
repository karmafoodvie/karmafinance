import clsx from "clsx";
import { formatPercent } from "@/lib/calculations";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import type { YoyResult } from "@/lib/vergleich";

// Der verbindliche Vorjahresvergleich-Baustein der App. Jede Seite, die eine
// Veränderung zum Vorjahr zeigt, benutzt diese Komponente — keine eigenen
// Prozentanzeigen mehr. Regeln:
//   grün/neon = Wachstum, orange = Rückgang, grau = kein Vergleich möglich
//   ▲ / ▼     = Richtung auch ohne Farbe erkennbar (Ausdruck, Farbsehschwäche)
//   Text      = immer "+/-x,x % vs. <Vergleichsfenster>" — nie eine nackte Zahl

export function YoyBadge({
  yoy,
  compact = false,
}: {
  yoy: YoyResult | null | undefined;
  compact?: boolean;
}) {
  const base = compact
    ? "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-semibold"
    : "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold";

  if (!yoy || yoy.pct == null) {
    const label = yoy?.newChannel ? "neu" : "kein Vorjahr";
    return (
      <span className={clsx(base, "bg-ink/5 text-ink/40 font-medium")} title={
        yoy?.newChannel
          ? "Im Vorjahreszeitraum gab es diesen Kanal noch nicht."
          : "Für den Vorjahreszeitraum liegen keine vergleichbaren Daten vor."
      }>
        {label}
      </span>
    );
  }

  const positive = yoy.pct >= 0;
  return (
    <span
      className={clsx(base, positive ? "bg-neon text-ink" : "bg-orange/15 text-orange")}
      title={`${yoy.currentLabel} gegen ${yoy.prevLabel}${
        yoy.partial ? ` — ${yoy.months} von ${yoy.ofMonths} Monaten vergleichbar` : ""
      }`}
    >
      <span aria-hidden>{positive ? "▲" : "▼"}</span>
      {formatPercent(yoy.pct)}
      {!compact && yoy.prevLabel && (
        <span className="font-medium opacity-70">vs. {yoy.prevLabel}</span>
      )}
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  yoy,
  info,
}: {
  label: string;
  value: string;
  sub?: string;
  yoy?: YoyResult | null;
  info?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 flex flex-col gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink/45">
        {label}
        {info && <InfoTooltip text={info} />}
      </span>
      <span className="font-heading text-2xl leading-none">{value}</span>
      <div className="flex flex-wrap items-center justify-between gap-1 min-h-[20px]">
        {sub && <span className="text-xs text-ink/45">{sub}</span>}
        {yoy !== undefined && <YoyBadge yoy={yoy} />}
      </div>
    </div>
  );
}
