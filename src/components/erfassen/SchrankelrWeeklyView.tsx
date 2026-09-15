"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { formatEur } from "@/lib/calculations";
import type { SchrankelrWeeklySummary, SchrankelrWeeklyOrder } from "@/lib/supabase/types";

interface Props {
  summaries: SchrankelrWeeklySummary[];
  orders: SchrankelrWeeklyOrder[];
  monthLabel: string;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-AT", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function SchrankelrWeeklyView({ summaries, orders, monthLabel }: Props) {
  const totalNetto = summaries.reduce((s, r) => s + (r.total_netto ?? 0), 0);
  const totalBrutto = summaries.reduce((s, r) => s + (r.total_brutto ?? 0), 0);

  // Produkte aggregieren
  const prodMap: Record<string, { qty: number; revenue: number }> = {};
  orders.forEach((o) => {
    if (!prodMap[o.product_name]) prodMap[o.product_name] = { qty: 0, revenue: 0 };
    prodMap[o.product_name].qty += o.quantity;
    prodMap[o.product_name].revenue += o.amount_netto;
  });
  const products = Object.entries(prodMap).sort((a, b) => b[1].revenue - a[1].revenue);

  if (!summaries.length) {
    return (
      <Card>
        <CardHeader
          title="Schrankerl"
          subtitle="Automatisch aus Outlook importiert"
        />
        <p className="text-sm text-ink/40 py-2">
          Keine Bestellungen mit Lieferung im {monthLabel} gefunden.
          <br />
          <span className="text-xs">Der wöchentliche Import läuft jeden Mittwoch automatisch.</span>
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Schrankerl"
        subtitle={`${summaries.length} KW${summaries.length > 1 ? "s" : ""} · Netto ${formatEur(totalNetto, true)} · Brutto ${formatEur(totalBrutto, true)}`}
      />

      {/* KW-Tabelle */}
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-ink/10">
              <th className="text-left font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pr-3">KW</th>
              <th className="text-left font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pr-3">Bestellnr.</th>
              <th className="text-left font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pr-3">Lieferung</th>
              <th className="text-right font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pr-3">Netto</th>
              <th className="text-right font-medium text-ink/50 text-xs uppercase tracking-wide py-2">Brutto</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.kw} className="border-b border-ink/5 last:border-0">
                <td className="py-2 pr-3 font-medium">KW {s.kw}</td>
                <td className="py-2 pr-3 text-ink/50 text-xs">{s.order_number ?? "—"}</td>
                <td className="py-2 pr-3 text-ink/70">{formatDate(s.delivery_date)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatEur(s.total_netto, true)}</td>
                <td className="py-2 text-right tabular-nums text-ink/50">{formatEur(s.total_brutto, true)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-ink/20">
              <td colSpan={3} className="py-2 text-xs text-ink/40">Gesamt</td>
              <td className="py-2 text-right tabular-nums font-semibold">{formatEur(totalNetto, true)}</td>
              <td className="py-2 text-right tabular-nums text-ink/50">{formatEur(totalBrutto, true)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Produktaufschlüsselung */}
      {products.length > 0 && (
        <div className="mt-4 pt-4 border-t border-ink/10">
          <p className="text-xs font-medium text-ink/40 uppercase tracking-wide mb-2">Produkte</p>
          <div className="flex flex-col gap-1">
            {products.map(([name, { qty, revenue }]) => (
              <div key={name} className="flex justify-between items-baseline gap-2 text-sm">
                <span className="text-ink/80 truncate">{name}</span>
                <span className="text-ink/50 shrink-0 text-xs">
                  {qty.toLocaleString("de-AT")} Stk · {formatEur(revenue, true)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-ink/30 mt-3 pt-3 border-t border-ink/5">
        Automatisch importiert via Outlook · jeden Mittwoch aktualisiert
      </p>
    </Card>
  );
}
