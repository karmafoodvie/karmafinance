import { subMonths } from "date-fns";
import { periodStart, QUICK_LINKS } from "@/lib/constants";
import { formatEur, shareOf } from "@/lib/calculations";
import { yoyErklaerung, type YoyResult } from "@/lib/vergleich";
import { buildLieferdiensteView, type LocationTotal } from "@/lib/lieferdienste";
import { StatTile, YoyBadge } from "@/components/ui/StatTile";
import { Card, CardHeader } from "@/components/ui/Card";
import { QuickLinks } from "@/components/ui/QuickLinks";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { LieferdiensteKanalChart } from "@/components/lieferdienste/LieferdiensteKanalChart";

const links = QUICK_LINKS.filter((l) => l.key === "wolt" || l.key === "foodora");

function KanalTabelle({
  rows,
  gesamt,
  hasPrevYear,
}: {
  rows: {
    key: string;
    label: string;
    color: string;
    total: number;
    prevTotal: number | null;
    yoy: YoyResult;
  }[];
  gesamt: number;
  hasPrevYear: boolean;
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.total)), 1);
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm min-w-[420px]">
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
            <tr key={r.key} className="border-b border-ink/5 last:border-0">
              <td className="py-2 pr-4">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: r.color }}
                  />
                  <span>{r.label}</span>
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

function StandortTabelle({
  rows,
  hasPrevYear,
}: {
  rows: LocationTotal[];
  hasPrevYear: boolean;
}) {
  const gesamt = rows.reduce((acc, r) => acc + r.total, 0);
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="border-b border-ink/10">
            <th className="text-left font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pr-4">
              Standort
            </th>
            <th className="text-right font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pr-4">
              Wolt
            </th>
            <th className="text-right font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pr-4">
              Foodora
            </th>
            {hasPrevYear && (
              <th className="text-right font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pr-4">
                vs. Vorjahr
              </th>
            )}
            <th className="text-right font-medium text-ink/50 text-xs uppercase tracking-wide py-2">
              Gesamt
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-b border-ink/5 last:border-0">
              <td className="py-2 pr-4">{r.name}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-ink/60">
                {formatEur(r.wolt)}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums text-ink/60">
                {formatEur(r.foodora)}
              </td>
              {hasPrevYear && (
                <td className="py-2 pr-4 text-right whitespace-nowrap">
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
            <td colSpan={hasPrevYear ? 4 : 3} className="py-2 text-xs text-ink/40 font-medium">
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

export default async function LieferdienstePage({
  searchParams,
}: {
  searchParams: Promise<{
    fromYear?: string;
    fromMonth?: string;
    toYear?: string;
    toMonth?: string;
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

  const view = await buildLieferdiensteView({ from: fromPeriod, to: toPeriod });
  const { kpis, months } = view;

  const rangeLabel =
    months.length <= 1
      ? (months[0]?.label ?? "")
      : `${months[0]?.label} – ${months[months.length - 1]?.label}`;

  const chartChannels = [
    { key: "Wolt" as const, label: "Wolt", color: "#1baf7a" },
    { key: "Foodora" as const, label: "Foodora", color: "#e87ba4" },
  ];

  const kanalRows = [
    {
      key: "wolt",
      label: "Wolt",
      color: "#1baf7a",
      total: kpis.woltTotal,
      prevTotal: kpis.woltYoy.previous,
      yoy: kpis.woltYoy,
    },
    {
      key: "foodora",
      label: "Foodora",
      color: "#e87ba4",
      total: kpis.foodoraTotal,
      prevTotal: kpis.foodoraYoy.previous,
      yoy: kpis.foodoraYoy,
    },
  ];

  const monateMitAbrechnung = view.chart.filter((p) => p.Wolt + p.Foodora > 0).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-xl">Lieferdienste</h1>
          <p className="text-sm text-ink/50 mt-1">
            Wolt &amp; Foodora — Kennzahlen sind die Summe über {rangeLabel}
          </p>
        </div>
        <DateRangePicker
          fromYear={fromYear}
          fromMonth={fromMonth}
          toYear={toYear}
          toMonth={toMonth}
        />
      </div>

      <div className="mb-6">
        <QuickLinks links={links} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Lieferdienste gesamt"
          value={formatEur(kpis.total)}
          sub="Wolt + Foodora"
          yoy={kpis.yoy}
          info={`Auszahlungen von Wolt und Foodora zusammen über ${rangeLabel}. Die Provisionen der Plattformen sind schon abgezogen. ${yoyErklaerung(kpis.yoy, "Vorjahresvergleich")}`}
        />
        <StatTile
          label="Wolt"
          value={formatEur(kpis.woltTotal)}
          sub="alle Standorte"
          yoy={kpis.woltYoy}
          info={`Wolt-Auszahlung über alle Standorte, ${rangeLabel}. ${yoyErklaerung(kpis.woltYoy, "Vorjahresvergleich")}`}
        />
        <StatTile
          label="Foodora"
          value={formatEur(kpis.foodoraTotal)}
          sub="alle Standorte"
          yoy={kpis.foodoraYoy}
          info={`Foodora-Auszahlung über alle Standorte, ${rangeLabel}. Quelle ist die Auszahlung je Standort. ${yoyErklaerung(kpis.foodoraYoy, "Vorjahresvergleich")}`}
        />
        <StatTile
          label="Ø pro Monat"
          value={
            monateMitAbrechnung > 0
              ? formatEur(kpis.total / monateMitAbrechnung)
              : "–"
          }
          sub={`${monateMitAbrechnung} Monate mit Abrechnung`}
          info={`Durchschnittliche Auszahlung je Monat, in dem überhaupt eine Abrechnung vorliegt (${monateMitAbrechnung} von ${view.chart.length} Monaten im gewählten Zeitraum). Eine Bestellanzahl gibt es derzeit für keinen der beiden Dienste: Wolt meldet sie nicht, und die Foodora-Tabelle mit den Bestellzahlen ist leer.`}
        />
      </div>

      <Card className="mb-4">
        <CardHeader
          title="Umsatz nach Kanal"
          subtitle={`${rangeLabel} — Kanäle anklicken zum Ein-/Ausblenden`}
        />
        <LieferdiensteKanalChart
          data={view.chart}
          channels={chartChannels}
          hasPrevYear={kpis.hasPrevYear}
        />
      </Card>

      <Card className="mb-4">
        <CardHeader
          title="Wolt vs. Foodora"
          subtitle={`Netto über ${rangeLabel}${kpis.hasPrevYear ? " — mit Vorjahreszeitraum" : ""}`}
        />
        <KanalTabelle rows={kanalRows} gesamt={kpis.total} hasPrevYear={kpis.hasPrevYear} />
      </Card>

      {view.locations.length > 0 && (
        <Card className="mb-4">
          <CardHeader
            title="Pro Standort"
            subtitle={`Wolt + Foodora zusammen, ${rangeLabel}`}
          />
          <StandortTabelle rows={view.locations} hasPrevYear={kpis.hasPrevYear} />
        </Card>
      )}

      <p className="text-xs text-ink/35 mt-6">
        Quelle: automatischer Import aus den Wolt- und Foodora-Auszahlungsmails
        — hier gibt es nichts mehr manuell einzutragen.
        {" · "}
        Jeder Prozentwert nennt sein Vergleichsfenster. Verglichen werden nur
        Monate, für die in beiden Jahren eine Abrechnung vorliegt; der
        laufende Monat bleibt außen vor. Wolt und Foodora sind erst ab August
        2025 erfasst — für frühere Zeiträume gibt es deshalb keinen
        Vorjahresvergleich.
      </p>
    </div>
  );
}
