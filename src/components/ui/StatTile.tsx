import clsx from "clsx";
import { formatPercent } from "@/lib/calculations";

export function YoyBadge({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <span className="inline-flex items-center rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink/40">
        kein Vorjahr
      </span>
    );
  }
  const positive = value >= 0;
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        positive ? "bg-neon text-ink" : "bg-orange/15 text-orange",
      )}
    >
      {formatPercent(value)} YoY
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  yoy,
}: {
  label: string;
  value: string;
  sub?: string;
  yoy?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-ink/45">
        {label}
      </span>
      <span className="font-heading text-2xl leading-none">{value}</span>
      <div className="flex items-center justify-between min-h-[20px]">
        {sub && <span className="text-xs text-ink/45">{sub}</span>}
        {yoy !== undefined && <YoyBadge value={yoy} />}
      </div>
    </div>
  );
}
