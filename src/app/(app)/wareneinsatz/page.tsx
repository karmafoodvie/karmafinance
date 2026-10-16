import { subMonths } from "date-fns";
import { periodStart } from "@/lib/constants";
import { formatEur } from "@/lib/calculations";
import { buildMarginRows, getProductCosts } from "@/lib/wareneinsatz";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { WareneinsatzManager } from "@/components/erfassen/WareneinsatzManager";

interface SearchParams {
  fromYear?: string;
  fromMonth?: string;
  toYear?: string;
  toMonth?: string;
}

export default async function WareneinsatzPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const now = new Date();
  const defaultFrom = subMonths(now, 2);

  const fromYear = Number(params.fromYear) || defaultFrom.getFullYear();
  const fromMonth = Number(params.fromMonth) || defaultFrom.getMonth() + 1;
  const toYear = Number(params.toYear) || now.getFullYear();
  const toMonth = Number(params.toMonth) || now.getMonth() + 1;

  let fromPeriod = periodStart(fromYear, fromMonth);
  let toPeriod = periodStart(toYear, toMonth);
  if (fromPeriod > toPeriod) {
    [fromPeriod, toPeriod] = [toPeriod, fromPeriod];
  }

  const { rows: costs, missingTable } = await getProductCosts();
  const rows = await buildMarginRows(fromPeriod, toPeriod, costs);

  const soldNames = new Set(rows.map((r) => r.product));
  const extraProductNames = costs
    .map((c) => c.product_name)
    .filter((n) => !soldNames.has(n));

  const withCost = rows.filter((r) => r.cost);
  const revenueWithCost = withCost.reduce((s, r) => s + r.revenueGross, 0);
  const revenueAll = rows.reduce((s, r) => s + r.revenueGross, 0);
  const marginTotal = withCost.reduce((s, r) => s + (r.marginTotal ?? 0), 0);
  const netWithCost = withCost.reduce(
    (s, r) => s + (r.avgPriceNet ?? 0) * r.quantity,
    0,
  );
  const coverage = revenueAll > 0 ? (revenueWithCost / revenueAll) * 100 : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="font-heading text-xl">Wareneinsatz</h1>
          <p className="text-sm text-ink/50 mt-1">
            Wareneinsatz pro Produkt hinterlegen und die Marge aus den
            Kassadaten (Stores) sehen.
          </p>
        </div>
        <DateRangePicker
          fromYear={fromYear}
          fromMonth={fromMonth}
          toYear={toYear}
          toMonth={toMonth}
        />
      </div>

      {missingTable && (
        <Card className="mb-6 border-orange/40">
          <p className="text-sm">
            Die Tabelle <code>product_cost</code> gibt es in der Datenbank noch
            nicht. Die Migration liegt unter{" "}
            <code>supabase/migrations/20261016090000_product_cost.sql</code> und
            muss einmal eingespielt werden, bevor du Werte speichern kannst.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <StatTile
          label="Ertrag (mit Wareneinsatz)"
          value={formatEur(marginTotal)}
          sub="Netto-Umsatz minus Wareneinsatz"
          info="Nur Produkte mit hinterlegtem Wareneinsatz. Vor Personal, Miete und sonstigen Betriebskosten."
        />
        <StatTile
          label="Marge gesamt"
          value={
            netWithCost > 0
              ? `${new Intl.NumberFormat("de-AT", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                }).format((marginTotal / netWithCost) * 100)} %`
              : "–"
          }
          sub="der Produkte mit Wareneinsatz"
          info="Ertrag geteilt durch Netto-Umsatz der Produkte mit hinterlegtem Wareneinsatz."
        />
        <StatTile
          label="Abgedeckt"
          value={`${Math.round(coverage)} %`}
          sub="des Umsatzes hat Wareneinsatz"
          info="Anteil am Brutto-Umsatz der Stores im Zeitraum, für den ein Wareneinsatz eingetragen ist. Je höher, desto aussagekräftiger die Marge."
        />
      </div>

      <WareneinsatzManager rows={rows} extraProductNames={extraProductNames} />

      <p className="text-xs text-ink/40 mt-4">
        Umsätze sind Kassa-Brutto (Stores). Die Marge wird mit dem hinterlegten
        Steuersatz auf Netto umgerechnet. Combos zählen als ein Produkt; für
        Rabatt- und Aktionsprodukte gilt der Durchschnittspreis. Welcher
        Steuersatz gilt, bitte mit der Steuerberatung abklären.
      </p>
    </div>
  );
}
