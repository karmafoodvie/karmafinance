"use client";

/**
 * Wochentrend-Popup — zeigt nach neuen Daten eine kompakte Zusammenfassung:
 * Trendchart der letzten Wochen + Ein-Satz-Summary + Hinweis bei unvollständiger Woche.
 *
 * TODO(integration):
 *  - Farben/Fonts unten sind Karma-Food-CI (Neongelb #D4FF3F, Orange #E94E1B,
 *    Dark Ink #1B1B14, Cream #FAF6EA / Boldonse, Geist). Falls die App das schon
 *    als Tailwind-Klassen oder CSS-Variablen hat, hier ersetzen statt inline.
 *  - Dieses File erwartet KEINE Chart-Lib (eigenes SVG), damit es ohne zusätzliche
 *    Dependency lauffähig ist.
 */

import { useEffect, useState } from "react";
import { fetchWeeklyTrend, WeeklyTrendData } from "../lib/weekly-trend";

const COLORS = {
  neon: "#D4FF3F",
  orange: "#E94E1B",
  ink: "#1B1B14",
  cream: "#FAF6EA",
};

function formatEuro(n: number): string {
  return new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatWeekLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" });
}

interface WeeklyTrendPopupProps {
  open: boolean;
  onClose: () => void;
}

export function WeeklyTrendPopup({ open, onClose }: WeeklyTrendPopupProps) {
  const [data, setData] = useState<WeeklyTrendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setErrorMsg(null);
    fetchWeeklyTrend(8)
      .then(setData)
      .catch((err) => setErrorMsg(err.message ?? "Unbekannter Fehler"))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Wochentrend-Update"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(27,27,20,0.55)",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.cream,
          color: COLORS.ink,
          borderRadius: 16,
          padding: "28px 32px",
          width: "min(480px, 92vw)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
          fontFamily: "Geist, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 4,
          }}
        >
          <h2
            style={{
              // TODO(integration): Boldonse statt Fallback, sobald in der App verfügbar
              fontFamily: "Boldonse, Geist, system-ui, sans-serif",
              fontSize: 20,
              margin: 0,
            }}
          >
            Wochentrend
          </h2>
          <button
            onClick={onClose}
            aria-label="Schließen"
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: COLORS.ink,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {loading && <p style={{ fontSize: 14, opacity: 0.75 }}>Lade Daten…</p>}

        {errorMsg && (
          <p style={{ fontSize: 14, color: COLORS.orange }}>
            Trend konnte nicht geladen werden: {errorMsg}
          </p>
        )}

        {data && !loading && !errorMsg && (
          <TrendBody data={data} />
        )}
      </div>
    </div>
  );
}

function TrendBody({ data }: { data: WeeklyTrendData }) {
  const { weeks, current, previous, deltaPct, currentWeekIncomplete } = data;

  const summarySentence = (() => {
    if (!previous) {
      return `Aktuelle Woche bisher ${formatEuro(current.revenue)}.`;
    }
    const sign = deltaPct !== null && deltaPct >= 0 ? "+" : "";
    const deltaStr = deltaPct !== null ? `${sign}${deltaPct.toFixed(1)}%` : "–";
    return `Diese Woche bisher ${formatEuro(current.revenue)}, Vorwoche ${formatEuro(
      previous.revenue
    )} — ${deltaStr}.`;
  })();

  return (
    <div>
      <p style={{ fontSize: 15, marginTop: 8, marginBottom: 4, fontWeight: 600 }}>
        {summarySentence}
      </p>

      {currentWeekIncomplete && (
        <p
          style={{
            fontSize: 12.5,
            color: COLORS.ink,
            opacity: 0.7,
            marginTop: 0,
            marginBottom: 16,
          }}
        >
          Achtung: die aktuelle Woche hat erst {current.tradingDays} von 5
          Handelstagen — noch kein vollständiger Wochenwert.
        </p>
      )}
      {!currentWeekIncomplete && <div style={{ marginBottom: 16 }} />}

      <TrendChart weeks={weeks} />

      <p style={{ fontSize: 11, opacity: 0.55, marginTop: 10, marginBottom: 0 }}>
        Umsatz pro Woche (Mo–Fr), 5 aktive Standorte, letzte {weeks.length} Wochen.
      </p>
    </div>
  );
}

function TrendChart({ weeks }: { weeks: { weekStart: string; revenue: number; tradingDays: number }[] }) {
  const width = 400;
  const height = 140;
  const padX = 8;
  const padTop = 16;
  const padBottom = 24;

  const values = weeks.map((w) => w.revenue);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const plotW = width - padX * 2;
  const plotH = height - padTop - padBottom;

  const points = weeks.map((w, i) => {
    const x = padX + (i / Math.max(weeks.length - 1, 1)) * plotW;
    const y = padTop + plotH - ((w.revenue - min) / range) * plotH;
    return { x, y, w };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)}` +
    ` L ${points[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      role="img"
      aria-label="Wochenumsatz-Trend, letzte Wochen"
    >
      <path d={areaPath} fill={COLORS.neon} opacity={0.35} />
      <path d={linePath} fill="none" stroke={COLORS.orange} strokeWidth={2} />

      {points.map((p, i) => {
        const isLastTwo = i >= points.length - 2;
        return (
          <g key={p.w.weekStart}>
            <circle
              cx={p.x}
              cy={p.y}
              r={isLastTwo ? 4.5 : 3}
              fill={i === points.length - 1 ? COLORS.orange : COLORS.ink}
              stroke={COLORS.cream}
              strokeWidth={isLastTwo ? 1.5 : 0}
            />
            {isLastTwo && (
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fontSize={10.5}
                fontFamily="Geist, system-ui, sans-serif"
                fill={COLORS.ink}
              >
                {formatEuro(p.w.revenue)}
              </text>
            )}
            <text
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              fontSize={9.5}
              fontFamily="Geist, system-ui, sans-serif"
              fill={COLORS.ink}
              opacity={0.6}
            >
              {formatWeekLabel(p.w.weekStart)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
