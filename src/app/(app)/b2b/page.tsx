import { subMonths } from "date-fns";
import { periodStart, monthLabel } from "@/lib/constants";
import { formatEur, shareOf } from "@/lib/calculations";
import { yoyErklaerung } from "@/lib/vergleich";
import {
  buildB2BView,
  getB2BMonthlyForPeriod,
  GROUP_LABEL,
  type ChannelTotal,
} from "@/lib/b2b";
import { getSchrankelrWeeklyForMonth } from "@/lib/data";
import { StatTile, YoyBadge } from "@/components/ui/StatTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { B2BKanalChart } from "@/components/b2b/B2BKanalChart";
import { B2BMonatForm } from "@/components/b2b/B2BMonatForm";
import { SchrankelrWeeklyView } from "@/components/erfassen/SchrankelrWeeklyView";

function KanalTabelle({
  rows,
  gesamt,
  hasPrevYear,
}: {
  rows: ChannelTotal[];
  gesamt: number;
  hasPrevYear: boolean;
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.total)), 1);
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr className="border-b border-ink/10">
            <th className="text-left font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pr-4">
              Kanal
            </th>
            <th className="text-left font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pr-4">
              Anteil
            </th>
            {hasPrevYear && (
              <th className="text-right font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pr-4">
                Vorjahr
              </th>
            )}
            <th className="text-right font-medium text-ink/50 text-xs uppercase tracking-wide py-2">
              Netto
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.channel_key} className="border-b border-ink/5 last:border-0">
              <td className="py-2 pr-4">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: r.color }}
                  />
                  <span>{r.label}</span>
                  <span className="text-xs text-ink/35">
                    {GROUP_LABEL[r.channel_group]}
                  </span>
                </div>
              </td>
              <td className="py-2 pr-4">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-ink/10 overflow-hidden hidden sm:block">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.round((Math.abs(r.total) / max) * 100)}%`,
                        background: r.color,
                      }}
                    />
                  </div>
                  <span className="text-ink/50 text-xs tabular-nums">
                    {shareOf(r.total, gesamt)}
                  </span>
                </div>
              </td>
              {hasPrevYear && (
                <td className="py-2 pr-4 text-right tabular-nums text-xs whitespace-nowrap">
                  <span className="text-ink/45 mr-2">{formatEur(r.prevTotal)}</span>
                  <YoyBadge yoy={r.yoy} compact />
                </td>
              )}
              <td className="py-2 text-right tabular-nums font-medium">
                {formatEur(r.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-ink/20">
            <td
              colSpan={hasPrevYear ? 3 : 2}
              className="py-2 text-xs text-ink/40 font-medium"
            >
              Gesamt
            </td>
            <td className="py-2 text-right tabular-nums font-semibold">
              {formatEur(gesamt)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default async function B2BPage({
  searchParams,
}: {
  searchParams: Promise<{
    fromYear?: string;
    fromMonth?: string;
    toYear?: string;
    toMonth?: string;
    /** Monat/Jahr der Eingabemaske — unabhängig vom Auswertungszeitraum */
    fy?: string;
    fm?: string;
  }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const defaultFrom = subMonths(now, 11);

  const fromYear = Number(params.fromYear) || defaultFrom.getFullYear();
  const fromMonth = Number(params.fromMonth) || defaultFrom.getMonth() + 1;
  const toYear = Number(params.toYear) || now.getFullYear();
  const toMonth = Number(params.toMonth) || now.getMonth() + 1;

  let fromPeriod = periodStart(fromYear, fromMonth);
  let toPeriod = periodStart(toYear, toMonth);
  if (fromPeriod > toPeriod) {
    [fromPeriod, toPeriod] = [toPeriod, fromPeriod];
  }

  const view = await buildB2BView({ from: fromPeriod, to: toPeriod });
  const { kpis, months } = view;

  // Die Eingabemaske hat ihren eigenen Monat (fy/fm) — voreingestellt ist der
  // letzte Monat des Auswertungszeitraums, änderbar ohne den Zeitraum oben
  // anzufassen.
  const lastPeriod = months[months.length - 1]?.periodStart ?? toPeriod;
  const [lastYearStr, lastMonthStr] = lastPeriod.split("-");
  const formYear = Number(params.fy) || Number(lastYearStr);
  const formMonth = Number(params.fm) || Number(lastMonthStr);
  const formPeriod = periodStart(formYear, formMonth);

  const [schrankerl, formRows] = await Promise.all([
    getSchrankelrWeeklyForMonth(formPeriod),
    getB2BMonthlyForPeriod(formPeriod),
  ]);
  const formValues: Record<string, number | null> = Object.fromEntries(
    formRows.map((r) => [r.channel_key, r.revenue_net]),
  );

  const rangeLabel =
    months.length <= 1
      ? (months[0]?.label ?? "")
      : `${months[0]?.label} – ${months[months.length - 1]?.label}`;

  const b2bChartChannels = view.channels
    .filter((c) => c.channel_group !== "catering")
    .map((c) => ({ key: c.channel_key, label: c.label, color: c.color }));

  const gesamtB2B = kpis.b2bTotal;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-xl">B2B</h1>
          <p className="text-sm text-ink/50 mt-1">
            Handel &amp; Kühlschränke — Kennzahlen sind die Summe über {rangeLabel}
          </p>
        </div>
        <DateRangePicker
          fromYear={fromYear}
          fromMonth={fromMonth}
          toYear={toYear}
          toMonth={toMonth}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="B2B gesamt"
          value={formatEur(kpis.b2bTotal)}
          sub="Handel + Kühlschränke"
          yoy={kpis.b2bYoy}
          info={`Nettoumsatz aller B2B-Kanäle über ${rangeLabel}: Gurkerl, Ototo, Alfies, Billa/REWE/Ja!Natürlich (Handel) sowie Schrankerl und Ritual Vend (Kühlschränke). Catering ist bewusst NICHT enthalten — das ist ein eigenes Geschäft. ${yoyErklaerung(kpis.b2bYoy, "Vorjahresvergleich")}`}
        />
        <StatTile
          label="Handel"
          value={formatEur(kpis.handelTotal)}
          sub="Gurkerl · Ototo · Alfies · Billa"
          yoy={kpis.handelYoy}
          info={`Verkauf verpackter Produkte an den Handel über ${rangeLabel}. ${yoyErklaerung(kpis.handelYoy, "Vorjahresvergleich")}`}
        />
        <StatTile
          label="Kühlschränke"
          value={formatEur(kpis.vendingTotal)}
          sub="Schrankerl + Ritual Vend"
          yoy={kpis.vendingYoy}
          info={`Ready2Eat-Gerichte über die Smart-Fridge-Partner, ${rangeLabel}. ${yoyErklaerung(kpis.vendingYoy, "Vorjahresvergleich")}`}
        />
        <StatTile
          label="Catering"
          value={formatEur(kpis.cateringTotal)}
          sub="eigenes Geschäft"
          yoy={kpis.cateringYoy}
          info={`Catering & Events über ${rangeLabel}. Wird hier getrennt ausgewiesen und zählt NICHT zum B2B-Umsatz, weil es ein eigenes Geschäft ist. ${yoyErklaerung(kpis.cateringYoy, "Vorjahresvergleich")}`}
        />
      </div>

      <Card className="mb-4">
        <CardHeader
          title="B2B-Umsatz nach Kanal"
          subtitle={`${rangeLabel} — Kanäle anklicken zum Ein-/Ausblenden`}
        />
        <B2BKanalChart
          data={view.chart}
          channels={b2bChartChannels}
          hasPrevYear={kpis.hasPrevYear}
        />
      </Card>

      <Card className="mb-4">
        <CardHeader
          title="Kanäle im Vergleich"
          subtitle={`Netto über ${rangeLabel}${kpis.hasPrevYear ? " — mit Vorjahreszeitraum" : ""}`}
        />
        <KanalTabelle
          rows={view.b2bChannels}
          gesamt={gesamtB2B}
          hasPrevYear={kpis.hasPrevYear}
        />
      </Card>

      {view.cateringChannels.length > 0 && (
        <Card className="mb-4">
          <CardHeader
            title="Catering"
            subtitle="Eigenes Geschäft — hier nur zur Einordnung, nicht im B2B-Umsatz oben enthalten"
          />
          <KanalTabelle
            rows={view.cateringChannels}
            gesamt={kpis.cateringTotal}
            hasPrevYear={kpis.hasPrevYear}
          />
        </Card>
      )}

      <div className="flex flex-col gap-4">
        <SchrankelrWeeklyView
          summaries={schrankerl.summaries}
          orders={schrankerl.orders}
          monthLabel={`${monthLabel(formMonth)} ${formYear}`}
        />

        {/* key sorgt dafür, dass die Felder beim Monatswechsel neu aufgebaut
            werden und nicht die Werte des vorigen Monats stehen bleiben. */}
        <B2BMonatForm
          key={formPeriod}
          channels={view.channels.map((c) => ({
            channel_key: c.channel_key,
            label: c.label,
            channel_group: c.channel_group,
            color: c.color,
          }))}
          year={formYear}
          month={formMonth}
          initial={formValues}
        />
      </div>

      <p className="text-xs text-ink/35 mt-6">
        Quelle der Kanalumsätze: Odoo-Verkaufsbericht (sale.order), Nettobeträge.
        {" · "}
        &bdquo;B2B&ldquo; umfasst Handel und Kühlschränke. Catering wird
        getrennt geführt, weil es ein eigenes Geschäft mit eigener Kalkulation
        ist.
        {" · "}
        Jeder Prozentwert nennt sein Vergleichsfenster. Verglichen werden nur
        Monate, für die in beiden Jahren Zahlen erfasst sind; der laufende,
        noch nicht abgeschlossene Monat bleibt außen vor.
      </p>
    </div>
  );
}
