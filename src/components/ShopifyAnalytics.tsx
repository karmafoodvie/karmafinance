"use client";

/**
 * Shopify-Analyse-Seite -- ersetzt das bisherige reine Eingabeformular.
 *
 * KPI-Leiste (abgeleitete Kennzahlen inkl. Vorjahres-/Vormonatsvergleich) +
 * Tagesverlauf-Chart (Tag/Monat umschaltbar) + Top-Produkte + Datenqualitaets-
 * Hinweis. Die manuelle Eingabe ist nur noch ein eingeklapptes Fallback-Feld.
 *
 * TODO(integration):
 *  - Styling unten ist Inline-CSS in Karma-Food-CI. Falls es schon Card-/
 *    Badge-Komponenten gibt (siehe DataChecklist.tsx aus der Ampelsystem-
 *    Lieferung), diese stattdessen verwenden.
 *  - Der Tag/Monat-Umschalter hier ist eine Mini-Variante. Falls du den
 *    GranularityToggle aus der "Tag/Monat-Umschalter"-Lieferung schon
 *    eingebaut hast, kannst du den hier weglassen und stattdessen diesen
 *    importieren -- visuelles Muster ist identisch.
 *  - "Manuell nachtragen" ruft absichtlich NICHT automatisch; verdrahte den
 *    onSubmit mit eurer bestehenden shopify_monthly-Upsert-Funktion (gab es
 *    schon vor dieser Lieferung).
 */
import { useEffect, useState, type ReactNode } from "react";
import {
  CompareMode,
  DataStatus,
  ShopifyDailyRow,
  ShopifyKpiRow,
  ShopifyTopProduct,
  fetchShopifyDailySeries,
  fetchShopifyDataStatus,
  fetchShopifyKpis,
  fetchShopifyTopProducts,
  formatCompare,
  formatEUR,
  formatPercent,
} from "@/lib/shopify-analytics";

const COLORS = {
  neon: "#D4FF3F",
  orange: "#E94E1B",
  ink: "#1B1B14",
  cream: "#FAF6EA",
  green: "#3FBF5F",
  yellow: "#E9B83F",
};

const STATUS_LABEL: Record<DataStatus, string> = {
  ok: "vollständig",
  stale: "unvollständig",
  missing: "fehlt",
};
const STATUS_COLOR: Record<DataStatus, string> = {
  ok: COLORS.green,
  stale: COLORS.yellow,
  missing: COLORS.orange,
};

function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" });
}

/** Buckets Tagesreihen zu Wochen, wenn "Monat"-Ansicht gewählt ist (hier:
 * innerhalb eines Monats sinnvoller als volle Monatssumme -> Wochenbuckets). */
function bucketWeekly(rows: ShopifyDailyRow[]): { label: string; total_sales: number; net_sales: number }[] {
  const buckets = new Map<string, { label: string; total_sales: number; net_sales: number }>();
  for (const r of rows) {
    const d = new Date(`${r.day_date}T00:00:00`);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Montag als Wochenstart
    const key = weekStart.toISOString().slice(0, 10);
    const bucket = buckets.get(key) ?? { label: `KW ${dayLabel(key)}`, total_sales: 0, net_sales: 0 };
    bucket.total_sales += Number(r.total_sales) || 0;
    bucket.net_sales += Number(r.net_sales) || 0;
    buckets.set(key, bucket);
  }
  return [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
}

/** Schlanker, abhängigkeitsfreier SVG-Linienchart (ersetzen, falls es schon
 * eine Chart-Lib in der App gibt). */
function LineChart({ points, formatY }: { points: { label: string; value: number }[]; formatY: (v: number) => string }) {
  const width = 640;
  const height = 160;
  const padding = 28;
  if (points.length === 0) {
    return <div style={{ color: COLORS.ink, opacity: 0.5, fontSize: 13, padding: 20 }}>Keine Daten für diesen Zeitraum.</div>;
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  const stepX = (width - padding * 2) / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (p.value / max) * (height - padding * 2);
    return { x, y, ...p };
  });
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", maxWidth: width }}>
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={COLORS.ink} strokeOpacity={0.15} />
      <path d={path} fill="none" stroke={COLORS.orange} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3} fill={COLORS.cream} stroke={COLORS.orange} strokeWidth={2} />
      ))}
      {coords.map((c, i) =>
        i === coords.length - 1 || i === 0 || i % Math.ceil(coords.length / 6) === 0 ? (
          <text key={`l${i}`} x={c.x} y={height - 8} fontSize={10} fill={COLORS.ink} opacity={0.6} textAnchor="middle">
            {c.label}
          </text>
        ) : null
      )}
      <text x={padding} y={16} fontSize={10} fill={COLORS.ink} opacity={0.5}>
        max {formatY(max)}
      </text>
    </svg>
  );
}

function KpiTile({ row }: { row: ShopifyKpiRow }) {
  const displayValue =
    row.unit === "EUR" ? formatEUR(row.value) : row.unit === "percent" ? formatPercent(row.value) : row.value?.toLocaleString("de-AT") ?? "–";
  const trendUp = (row.compare_pct ?? 0) > 0;
  const trendColor = !row.compare_available ? COLORS.ink : trendUp ? COLORS.green : COLORS.orange;
  return (
    <div
      style={{
        background: COLORS.cream,
        border: `2px solid ${COLORS.ink}`,
        borderRadius: 14,
        padding: "14px 16px",
        minWidth: 150,
        flex: "1 1 150px",
      }}
    >
      <div style={{ fontFamily: "Geist, system-ui, sans-serif", fontSize: 12, color: COLORS.ink, opacity: 0.65, marginBottom: 4 }}>
        {row.label}
      </div>
      <div style={{ fontFamily: "Boldonse, system-ui, sans-serif", fontSize: 20, color: COLORS.ink }}>{displayValue}</div>
      <div style={{ fontSize: 11.5, marginTop: 4, color: trendColor, opacity: row.compare_available ? 1 : 0.55 }}>
        {row.compare_available ? (trendUp ? "▲ " : "▼ ") : ""}
        {formatCompare(row)}
      </div>
    </div>
  );
}

export function ShopifyAnalytics({
  periodStart,
  manualEntry,
}: {
  periodStart: string; // YYYY-MM-01, kommt vom PeriodPicker der Seite
  manualEntry?: ReactNode; // bestehendes Eingabeformular, eingeklappt
}) {
  const [compareMode, setCompareMode] = useState<CompareMode>("yoy");
  const [chartView, setChartView] = useState<"day" | "week">("day");
  const [kpis, setKpis] = useState<ShopifyKpiRow[]>([]);
  const [daily, setDaily] = useState<ShopifyDailyRow[]>([]);
  const [topProducts, setTopProducts] = useState<ShopifyTopProduct[]>([]);
  const [status, setStatus] = useState<{ status: DataStatus; detail: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showManualEntry, setShowManualEntry] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    Promise.all([
      fetchShopifyKpis(periodStart, compareMode),
      fetchShopifyDailySeries(periodStart),
      fetchShopifyTopProducts(periodStart, 5),
      fetchShopifyDataStatus(periodStart),
    ]).then(([k, d, p, s]) => {
      if (cancelled) return;
      setKpis(k);
      setDaily(d);
      setTopProducts(p);
      setStatus(s);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [periodStart, compareMode]);

  const chartPoints =
    chartView === "day"
      ? daily.map((d) => ({ label: dayLabel(d.day_date), value: Number(d.total_sales) || 0 }))
      : bucketWeekly(daily).map((b) => ({ label: b.label, value: b.total_sales }));

  return (
    <div style={{ fontFamily: "Geist, system-ui, sans-serif", color: COLORS.ink, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Kopfzeile: Zeitraum + Vergleichsmodus */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontFamily: "Boldonse, system-ui, sans-serif", fontSize: 22, margin: 0 }}>Webshop-Analyse</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div role="group" aria-label="Vergleichsmodus" style={{ display: "inline-flex", gap: 6 }}>
            {(["yoy", "mom"] as CompareMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setCompareMode(mode)}
                aria-pressed={compareMode === mode}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: compareMode === mode ? `2px solid ${COLORS.neon}` : "2px solid transparent",
                  background: COLORS.ink,
                  color: compareMode === mode ? COLORS.neon : COLORS.cream,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {mode === "yoy" ? "vs. Vorjahr" : "vs. Vormonat"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Datenqualitäts-Hinweis direkt auf der Seite */}
      {status && status.status !== "ok" && (
        <div
          style={{
            background: COLORS.cream,
            border: `2px solid ${STATUS_COLOR[status.status]}`,
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 13,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span
            style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_COLOR[status.status], display: "inline-block" }}
          />
          <strong>{STATUS_LABEL[status.status]}:</strong> {status.detail}
        </div>
      )}

      {/* KPI-Leiste */}
      {loading ? (
        <p style={{ opacity: 0.6 }}>Lade…</p>
      ) : (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {kpis.map((row) => (
            <KpiTile key={row.metric_key} row={row} />
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{ background: COLORS.cream, border: `2px solid ${COLORS.ink}`, borderRadius: 16, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <strong style={{ fontSize: 14 }}>Umsatz brutto im Zeitverlauf</strong>
          <div role="group" aria-label="Chart-Auflösung" style={{ display: "inline-flex", gap: 6 }}>
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setChartView(v)}
                aria-pressed={chartView === v}
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  border: chartView === v ? `2px solid ${COLORS.orange}` : "2px solid transparent",
                  background: "transparent",
                  color: COLORS.ink,
                  fontWeight: chartView === v ? 700 : 400,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {v === "day" ? "Tag" : "Woche"}
              </button>
            ))}
          </div>
        </div>
        <LineChart points={chartPoints} formatY={formatEUR} />
      </div>

      {/* Top-Produkte */}
      <div style={{ background: COLORS.cream, border: `2px solid ${COLORS.ink}`, borderRadius: 16, padding: 18 }}>
        <strong style={{ fontSize: 14 }}>Top 5 Produkte (Nettoumsatz)</strong>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 10 }}>
          <tbody>
            {topProducts.map((p) => (
              <tr key={p.product_title} style={{ borderTop: `1px solid ${COLORS.ink}22` }}>
                <td style={{ padding: "6px 0" }}>{p.product_title}</td>
                <td style={{ padding: "6px 0", textAlign: "right" }}>{formatEUR(p.net_sales)}</td>
                <td style={{ padding: "6px 0", textAlign: "right", opacity: 0.6 }}>{p.orders} Bestellungen</td>
              </tr>
            ))}
            {topProducts.length === 0 && (
              <tr>
                <td style={{ padding: "6px 0", opacity: 0.5 }}>Keine Produktdaten für diesen Monat.</td>
              </tr>
            )}
          </tbody>
        </table>
        <a href="/produkte" style={{ display: "inline-block", marginTop: 10, fontSize: 12.5, color: COLORS.orange }}>
          Alle Produkte ansehen →
        </a>
      </div>

      {/* Manuelle Eingabe -- nur noch Ausnahme-Fallback */}
      <div>
        <button
          onClick={() => setShowManualEntry((v) => !v)}
          style={{ background: "transparent", border: "none", color: COLORS.ink, opacity: 0.7, textDecoration: "underline", cursor: "pointer", fontSize: 13, padding: 0 }}
        >
          {showManualEntry ? "Manuelles Nachtragen ausblenden" : "Falls Automatisierung mal ausfällt: manuell nachtragen ▸"}
        </button>
        {showManualEntry && (
          <div style={{ marginTop: 10 }}>{manualEntry}</div>
        )}
      </div>
    </div>
  );
}
