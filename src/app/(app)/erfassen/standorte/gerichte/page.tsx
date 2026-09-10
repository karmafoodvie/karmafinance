import { format } from "date-fns";
import { buildDishData, MENU_ERA_START } from "@/lib/dishes";
import { resolveShopsParams, type ShopsSearchParams } from "@/lib/shopsParams";
import { formatEur, formatNumber } from "@/lib/calculations";
import { StatTile } from "@/components/ui/StatTile";
import { Card, CardHeader } from "@/components/ui/Card";

const CAT_LABEL: Record<string, string> = {
  Curry: "Curry",
  Dal: "Dal",
  Lasagne: "Lasagne",
  Biryani: "Biryani",
  Bowl: "Bowl",
  Special: "Special",
  Wochensalat: "Wochensalat",
};

export default async function GerichtePage({
  searchParams,
}: {
  searchParams: Promise<ShopsSearchParams>;
}) {
  const params = await searchParams;
  const p = resolveShopsParams(params);

  // Vor der Menü-Ära gibt es keinen datierten Kalender — sonst würden alte
  // Tage fälschlich als "außer Plan" gezählt. Deshalb hart ab 07.09.2026.
  const clampedFrom = p.fromDate < MENU_ERA_START ? MENU_ERA_START : p.fromDate;
  const wasClamped = clampedFrom !== p.fromDate;

  const data = await buildDishData(clampedFrom, p.toDate, p.locationFilter);

  const fromLabel = format(new Date(clampedFrom), "dd.MM.yyyy");
  const toLabel = format(new Date(p.toDate), "dd.MM.yyyy");

  if (!data.hasData || !data.hasPlan) {
    return (
      <Card>
        <p className="text-sm text-ink/50 py-6 text-center">
          Für den gewählten Zeitraum liegen noch keine zuordenbaren Tagesdaten
          vor. Die Pro-Gericht-Auswertung startet mit dem aktuellen Menü am
          07.09.2026 und füllt sich, je mehr Tage importiert sind.
        </p>
      </Card>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="Gerichte erfasst"
          value={formatNumber(data.totals.dishCount)}
          sub={`${fromLabel} – ${toLabel}`}
          info="Anzahl unterschiedlicher Tagesgerichte mit Umsatz im Zeitraum. Baut sich über die 4-Wochen-Rotation auf."
        />
        <StatTile
          label="Umsatz zugeordnet"
          value={formatEur(data.totals.attributedRevenue)}
          sub="auf Gerichte verteilt"
          info="Summe, die eindeutig einem Tagesgericht zugeordnet werden konnte (Kategorie-Umsatz am jeweiligen Serviertag)."
        />
        <StatTile
          label="Lunch Combos"
          value={formatEur(data.totals.comboRevenue)}
          sub={`${formatNumber(data.totals.comboQty)} Stück · nicht auf Gericht aufteilbar`}
          info="Lunch/Dinner Combos werden als eigener Button gebucht, ohne Angabe welches Gericht enthalten war — daher ein eigener Topf, nicht auf einzelne Gerichte verteilt."
        />
        <StatTile
          label="Außer Plan"
          value={formatEur(data.totals.anomalyRevenue)}
          sub="mögliche Tippfehler"
          info="Verkäufe in einer Kategorie, die an dem Tag nicht am Menüplan stand (z. B. ein Wochensalat, obwohl keiner angeboten wurde). Meist Kassa-Tippfehler."
        />
      </div>

      {wasClamped && (
        <p className="text-xs text-ink/40 mb-4">
          Hinweis: Vor dem 07.09.2026 lief ein anderes Menü ohne datierten
          Kalender — der Zeitraum wurde daher auf den Start des aktuellen Menüs
          begrenzt.
        </p>
      )}

      <Card className="mb-4">
        <CardHeader
          title="Umsatz pro Gericht"
          subtitle={`${fromLabel} – ${toLabel} · nach Umsatz sortiert`}
        />
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="text-left text-ink/45 border-b border-ink/10">
                <th className="font-medium py-2 pr-3">Gericht</th>
                <th className="font-medium py-2 px-3">Kategorie</th>
                <th className="font-medium py-2 px-3 text-right">Tage</th>
                <th className="font-medium py-2 px-3 text-right">Stück</th>
                <th className="font-medium py-2 px-3 text-right">Umsatz</th>
                <th className="font-medium py-2 pl-3 text-right">⌀ / Tag</th>
              </tr>
            </thead>
            <tbody>
              {data.dishes.map((d) => (
                <tr key={d.dishName} className="border-b border-ink/5 last:border-0">
                  <td className="py-2 pr-3 text-ink/80">{d.dishName}</td>
                  <td className="py-2 px-3 text-ink/45">{CAT_LABEL[d.category] ?? d.category}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink/50">{d.daysServed}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatNumber(d.quantity)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatEur(d.revenue)}</td>
                  <td className="py-2 pl-3 text-right tabular-nums text-ink/60">{formatEur(d.avgPerDay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {data.anomalies.length > 0 && (
        <Card className="mb-4">
          <CardHeader
            title="Außer Plan verkauft"
            subtitle="Kategorie wurde an einem Tag verkauft, an dem sie nicht am Menü stand — meist Tippfehler an der Kassa"
          />
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="text-left text-ink/45 border-b border-ink/10">
                  <th className="font-medium py-2 pr-3">Kategorie</th>
                  <th className="font-medium py-2 px-3 text-right">Tage</th>
                  <th className="font-medium py-2 px-3 text-right">Stück</th>
                  <th className="font-medium py-2 pl-3 text-right">Umsatz</th>
                </tr>
              </thead>
              <tbody>
                {data.anomalies.map((a) => (
                  <tr key={a.category} className="border-b border-ink/5 last:border-0">
                    <td className="py-2 pr-3 text-ink/70">{CAT_LABEL[a.category] ?? a.category}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-ink/50">{a.days}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatNumber(a.quantity)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums text-orange">{formatEur(a.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-ink/35">
        So wird gerechnet: Jedes Tagesgericht bekommt den Kassa-Umsatz seiner
        Kategorie (Curry/Dal/Lasagne/Biryani/Bowl/Special) an dem Tag, an dem es
        serviert wurde — möglich, weil pro Tag jede Kategorie nur einmal läuft.
        {" · "}
        Lunch Combos ({formatEur(data.totals.comboRevenue)}) und Mix Portionen (
        {formatEur(data.totals.mixRevenue)}) haben keine Gericht-Zuordnung.
        {" · "}
        Das Sommer-Menü (bis 06.09.2026) hat keinen datierten Kalender und ist
        deshalb nicht pro Gericht auswertbar.
      </p>
    </div>
  );
}
