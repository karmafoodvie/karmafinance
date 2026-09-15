import { Card, CardHeader } from "@/components/ui/Card";
import { formatEur } from "@/lib/calculations";
import { B2B_DATA, B2B_CHANNELS } from "@/lib/b2bData";
import { B2BKanalChart } from "@/components/b2b/B2BKanalChart";

// ─── Aggregationen ───────────────────────────────────────────────────────────
function totals() {
  const t = { schrankerl: 0, ritualVend: 0, gurkerl: 0, ototo: 0, alfies: 0, billa: 0, catering: 0 };
  for (const row of B2B_DATA) {
    for (const k of Object.keys(t) as (keyof typeof t)[]) {
      t[k] += row[k] ?? 0;
    }
  }
  return t;
}

export default function B2BPage() {
  const t = totals();
  const grand = Object.values(t).reduce((s, v) => s + v, 0);
  const kuhlschranke = t.schrankerl + t.ritualVend;
  const onlineRetail = t.gurkerl + t.ototo + t.alfies;

  const recent = B2B_DATA.slice(-12);

  const channelRows = B2B_CHANNELS.map((ch) => ({
    ...ch,
    total: t[ch.key as keyof typeof t],
  })).sort((a, b) => b.total - a.total);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl">B2B Kanalübersicht</h1>
        <p className="text-sm text-ink/50 mt-1">
          Odoo Verkaufsaufträge · Aug 2024 – Sep 2026 · Netto
        </p>
      </div>

      {/* KPI-Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="col-span-2 md:col-span-1 bg-ink text-cream border-ink">
          <p className="text-xs text-cream/50 uppercase tracking-wide mb-1">Gesamt B2B</p>
          <p className="font-heading text-2xl text-neon leading-none">{formatEur(grand)}</p>
          <p className="text-xs text-cream/40 mt-1">Aug 2024 – Sep 2026</p>
        </Card>
        <Card>
          <p className="text-xs text-ink/40 uppercase tracking-wide mb-1">Kühlschränke</p>
          <p className="font-heading text-xl leading-none">{formatEur(kuhlschranke)}</p>
          <p className="text-xs text-ink/40 mt-1">Schrankerl + Ritual Vend · {((kuhlschranke / grand) * 100).toFixed(0)}%</p>
        </Card>
        <Card>
          <p className="text-xs text-ink/40 uppercase tracking-wide mb-1">Online Retail</p>
          <p className="font-heading text-xl leading-none">{formatEur(onlineRetail)}</p>
          <p className="text-xs text-ink/40 mt-1">Gurkerl · Ototo · Alfies</p>
        </Card>
        <Card>
          <p className="text-xs text-ink/40 uppercase tracking-wide mb-1">Billa/REWE</p>
          <p className="font-heading text-xl leading-none">{formatEur(t.billa)}</p>
          <p className="text-xs text-ink/40 mt-1">Stationärer Handel · {((t.billa / grand) * 100).toFixed(0)}%</p>
        </Card>
        <Card>
          <p className="text-xs text-ink/40 uppercase tracking-wide mb-1">Catering & Events</p>
          <p className="font-heading text-xl leading-none">{formatEur(t.catering)}</p>
          <p className="text-xs text-ink/40 mt-1">{((t.catering / grand) * 100).toFixed(0)}% des Gesamtumsatzes</p>
        </Card>
      </div>

      {/* Monatschart */}
      <Card>
        <CardHeader
          title="Umsatz nach Kanal – monatlich"
          subtitle="Netto, gestapelt · Aug 2024 – Sep 2026"
        />
        <B2BKanalChart />
      </Card>

      {/* Kanäle gesamt */}
      <Card>
        <CardHeader title="Kanäle gesamt" subtitle="Aug 2024 – Sep 2026" />
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="border-b border-ink/10">
                <th className="text-left font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pr-4">Kanal</th>
                <th className="text-left font-medium text-ink/50 text-xs uppercase tracking-wide py-2 pr-4">Anteil</th>
                <th className="text-right font-medium text-ink/50 text-xs uppercase tracking-wide py-2">Netto gesamt</th>
              </tr>
            </thead>
            <tbody>
              {channelRows.map((ch) => {
                const pct = ((ch.total / grand) * 100).toFixed(1);
                const barW = Math.round((ch.total / channelRows[0].total) * 100);
                return (
                  <tr key={ch.key} className="border-b border-ink/5 last:border-0">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ch.color }} />
                        {ch.label}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-ink/10 overflow-hidden hidden sm:block">
                          <div className="h-full rounded-full" style={{ width: `${barW}%`, background: ch.color }} />
                        </div>
                        <span className="text-ink/50 text-xs">{pct}%</span>
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">{formatEur(ch.total)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-ink/20">
                <td colSpan={2} className="py-2 text-xs text-ink/40 font-medium">Gesamt</td>
                <td className="py-2 text-right tabular-nums font-semibold">{formatEur(grand)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Monatliche Detailansicht */}
      <Card>
        <CardHeader title="Letzte 12 Monate" subtitle="Netto pro Kanal" />
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="text-xs min-w-[700px] w-full">
            <thead>
              <tr className="border-b border-ink/10">
                <th className="text-left font-medium text-ink/50 uppercase tracking-wide py-2 pr-3 sticky left-0 bg-white/70">Kanal</th>
                {recent.map((r) => (
                  <th key={r.month} className="text-right font-medium text-ink/50 uppercase tracking-wide py-2 px-2 whitespace-nowrap">
                    {r.month}
                  </th>
                ))}
                <th className="text-right font-medium text-ink/50 uppercase tracking-wide py-2 pl-3">Σ</th>
              </tr>
            </thead>
            <tbody>
              {channelRows.map((ch) => {
                const rowSum = recent.reduce((s, r) => s + (r[ch.key as keyof typeof r] as number), 0);
                return (
                  <tr key={ch.key} className="border-b border-ink/5 last:border-0">
                    <td className="py-1.5 pr-3 sticky left-0 bg-white/70">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ch.color }} />
                        <span className="whitespace-nowrap">{ch.label}</span>
                      </div>
                    </td>
                    {recent.map((r) => {
                      const v = r[ch.key as keyof typeof r] as number;
                      return (
                        <td key={r.month} className="py-1.5 px-2 text-right tabular-nums" style={{ color: v === 0 ? "rgba(26,26,26,0.25)" : undefined }}>
                          {v === 0 ? "—" : Math.round(v).toLocaleString("de-AT")}
                        </td>
                      );
                    })}
                    <td className="py-1.5 pl-3 text-right tabular-nums font-semibold">
                      {formatEur(rowSum)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-ink/15">
                <td className="py-2 text-ink/50 font-medium sticky left-0 bg-white/70">Gesamt</td>
                {recent.map((r) => {
                  const tot = B2B_CHANNELS.reduce((s, ch) => s + (r[ch.key as keyof typeof r] as number), 0);
                  return (
                    <td key={r.month} className="py-2 px-2 text-right tabular-nums font-semibold">
                      {Math.round(tot).toLocaleString("de-AT")}
                    </td>
                  );
                })}
                <td className="py-2 pl-3 text-right tabular-nums font-bold">
                  {formatEur(recent.reduce((s, r) => s + B2B_CHANNELS.reduce((ss, ch) => ss + (r[ch.key as keyof typeof r] as number), 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <p className="text-xs text-ink/30 text-center pb-2">
        Datenstand: Odoo sale.order Export · Für Produktdetails → sale.order.line Export aus Odoo
      </p>
    </div>
  );
}
