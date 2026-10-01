"use client";

/**
 * Ampelsystem/Checkliste für die Finanz-App.
 *
 * Zeigt pro Monat, ob alle benötigten Datenquellen vollständig eingepflegt
 * sind (Kassensystem, Wolt, Foodora, B2B, Shopify, TGTG) - analog zur
 * bestehenden Automatisierung (Wolt/Foodora laufen automatisch aus den
 * Auszahlungsmails, B2B kommt als Odoo-Export). Zusätzlich ein
 * Verifikations-Block, der die eingepflegten Kassensystem-Zahlen je
 * Standort gegencheckt (Tagesumsätze vs. Produktebene-Summe).
 *
 * TODO(integration): Styling unten ist Inline-CSS in Karma-Food-CI
 * (Neongelb #D4FF3F, Orange #E94E1B, Dark Ink, Cream). Falls es bereits
 * Card/Panel-Komponenten gibt, diese stattdessen verwenden.
 */
import { useEffect, useMemo, useState } from "react";
import {
  AmpelStatus,
  ChecklistRow,
  ConsistencyRow,
  fetchDataChecklist,
  fetchRevenueConsistency,
  periodStartOf,
  worstStatus,
} from "../lib/data-checklist";

const COLORS = {
  neon: "#D4FF3F",
  orange: "#E94E1B",
  ink: "#1B1B14",
  cream: "#FAF6EA",
  green: "#3FBF5F",
  yellow: "#E9B83F",
  red: "#E94E1B",
};

const STATUS_COLOR: Record<AmpelStatus, string> = {
  green: COLORS.green,
  yellow: COLORS.yellow,
  red: COLORS.red,
};

const STATUS_LABEL: Record<AmpelStatus, string> = {
  green: "vollständig",
  yellow: "teilweise",
  red: "fehlt",
};

function AmpelDot({ status, size = 12 }: { status: AmpelStatus; size?: number }) {
  return (
    <span
      aria-label={STATUS_LABEL[status]}
      title={STATUS_LABEL[status]}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: STATUS_COLOR[status],
        flexShrink: 0,
      }}
    />
  );
}

function formatMonthLabel(periodStart: string): string {
  const d = new Date(`${periodStart}T00:00:00`);
  return d.toLocaleDateString("de-AT", { month: "long", year: "numeric" });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "noch nie";
  return new Date(iso).toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Liste der letzten `count` Monatsanfänge (aktueller Monat zuerst). */
function recentMonths(count = 4): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(periodStartOf(d));
  }
  return out;
}

export function DataChecklist() {
  const months = useMemo(() => recentMonths(4), []);
  const [periodStart, setPeriodStart] = useState(months[0]);
  const [checklist, setChecklist] = useState<ChecklistRow[]>([]);
  const [consistency, setConsistency] = useState<ConsistencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConsistency, setShowConsistency] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchDataChecklist(periodStart), fetchRevenueConsistency(periodStart)]).then(
      ([a, b]) => {
        if (cancelled) return;
        setChecklist(a);
        setConsistency(b);
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [periodStart]);

  const overall = checklist.length ? worstStatus(checklist) : "yellow";

  return (
    <div
      style={{
        fontFamily: "Geist, system-ui, sans-serif",
        background: COLORS.cream,
        border: `2px solid ${COLORS.ink}`,
        borderRadius: 16,
        padding: 20,
        maxWidth: 560,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3
          style={{
            fontFamily: "Boldonse, system-ui, sans-serif",
            margin: 0,
            fontSize: 18,
            color: COLORS.ink,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AmpelDot status={overall} size={14} />
          Daten-Checkliste
        </h3>
        <select
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
          style={{
            border: `2px solid ${COLORS.ink}`,
            borderRadius: 999,
            padding: "4px 10px",
            background: "transparent",
            color: COLORS.ink,
            fontFamily: "Geist, system-ui, sans-serif",
            fontSize: 13,
          }}
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {formatMonthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ color: COLORS.ink, opacity: 0.6, fontSize: 14 }}>Lade…</p>
      ) : (
        <>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {checklist.map((row) => (
              <li
                key={row.source_key}
                style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
              >
                <span style={{ marginTop: 3 }}>
                  <AmpelDot status={row.status} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: COLORS.ink, fontSize: 14 }}>{row.source_label}</div>
                  <div style={{ fontSize: 12.5, color: COLORS.ink, opacity: 0.7 }}>{row.detail}</div>
                  <div style={{ fontSize: 11, color: COLORS.ink, opacity: 0.45 }}>
                    zuletzt aktualisiert: {formatDateTime(row.last_updated)}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setShowConsistency((v) => !v)}
            style={{
              marginTop: 16,
              background: "transparent",
              border: "none",
              color: COLORS.ink,
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: 13,
              padding: 0,
            }}
          >
            {showConsistency ? "Verifikation ausblenden" : "Kassensystem-Zahlen verifizieren ▸"}
          </button>

          {showConsistency && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 12, color: COLORS.ink, opacity: 0.6, margin: "0 0 8px" }}>
                Vergleicht Tagesumsätze (alle Kanäle) gegen die Produktebene (Shop) je
                Standort. ~2–3 % Differenz ist normal (Rabatte/Gebühren laufen in Odoo
                separat). Größere Abweichungen verdienen einen Blick.
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: COLORS.ink, opacity: 0.6 }}>
                    <th style={{ paddingBottom: 4 }}></th>
                    <th style={{ paddingBottom: 4 }}>Standort</th>
                    <th style={{ paddingBottom: 4, textAlign: "right" }}>Tagesumsatz</th>
                    <th style={{ paddingBottom: 4, textAlign: "right" }}>Produktebene</th>
                    <th style={{ paddingBottom: 4, textAlign: "right" }}>Diff.</th>
                  </tr>
                </thead>
                <tbody>
                  {consistency.map((row) => (
                    <tr key={row.location_code} style={{ borderTop: `1px solid ${COLORS.ink}22` }}>
                      <td style={{ padding: "5px 6px 5px 0" }}>
                        <AmpelDot status={row.status} size={9} />
                      </td>
                      <td style={{ padding: "5px 0", color: COLORS.ink }}>{row.location_name}</td>
                      <td style={{ padding: "5px 0", textAlign: "right", color: COLORS.ink }}>
                        {row.order_daily_revenue.toLocaleString("de-AT", { style: "currency", currency: "EUR" })}
                      </td>
                      <td style={{ padding: "5px 0", textAlign: "right", color: COLORS.ink }}>
                        {row.product_monthly_revenue.toLocaleString("de-AT", { style: "currency", currency: "EUR" })}
                      </td>
                      <td style={{ padding: "5px 0", textAlign: "right", color: COLORS.ink, opacity: 0.75 }}>
                        {row.diff_pct !== null ? `${row.diff_pct > 0 ? "+" : ""}${row.diff_pct}%` : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
