"use client";

/**
 * Finanz-Chat Phase 1 -- schwebender Button + Panel mit festen Frage-
 * Templates (kein Freitext, siehe lib/finance-chat.ts fuer die Begruendung).
 *
 * Einbau: <FinanceChatWidget page="shopify" periodStart={periodStart} /> auf
 * der Shopify-Seite (periodStart = der dort aktuell gewaehlte Monat, damit
 * der Chat-Kontext mit der Seite uebereinstimmt) bzw.
 * <FinanceChatWidget page="dashboard" periodStart={periodStart} /> auf der
 * Dashboard-Seite. Fuer Phase 3 (global auf jeder Seite) dieselbe Komponente
 * einmal ins Root-Layout haengen und page serverseitig/per Router bestimmen.
 *
 * TODO(integration): Positionierung aktuell fixed bottom-right -- ggf. an
 * bestehendes Layout (z.B. falls schon ein anderes fixed-Element dort sitzt)
 * anpassen.
 */
import { useState } from "react";
import { ChatAnswer, ChatPage, templatesForPage } from "@/lib/finance-chat";

const COLORS = {
  neon: "#D4FF3F",
  ink: "#1B1B14",
  cream: "#FAF6EA",
  orange: "#E94E1B",
};

interface FinanceChatWidgetProps {
  page: ChatPage;
  periodStart: string;
  periodLabel?: string; // optional, sonst wird aus periodStart abgeleitet
}

interface Entry {
  question: string;
  answer: ChatAnswer | null;
  loading: boolean;
}

export function FinanceChatWidget({ page, periodStart, periodLabel }: FinanceChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const templates = templatesForPage(page);

  async function ask(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const idx = entries.length;
    setEntries((prev) => [...prev, { question: template.question, answer: null, loading: true }]);
    const answer = await template.run(periodStart);
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, answer, loading: false } : e)));
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Finanz-Chat öffnen"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: COLORS.neon,
          border: `2px solid ${COLORS.ink}`,
          color: COLORS.ink,
          fontSize: 22,
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          zIndex: 1000,
        }}
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 92,
            right: 24,
            width: 340,
            maxHeight: "70vh",
            overflowY: "auto",
            background: COLORS.cream,
            border: `2px solid ${COLORS.ink}`,
            borderRadius: 16,
            padding: 16,
            fontFamily: "Geist, system-ui, sans-serif",
            color: COLORS.ink,
            zIndex: 1000,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ fontFamily: "Boldonse, system-ui, sans-serif", fontSize: 15, marginBottom: 4 }}>Finanz-Chat</div>
          <div style={{ fontSize: 11.5, opacity: 0.6, marginBottom: 12 }}>
            Du fragst gerade zu {periodLabel ?? periodStart} / {page === "shopify" ? "Shopify" : "Dashboard"}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {entries.map((e, i) => (
              <div key={i} style={{ fontSize: 13 }}>
                <div style={{ fontWeight: 700 }}>{e.question}</div>
                {e.loading ? (
                  <div style={{ opacity: 0.5 }}>lade…</div>
                ) : (
                  <>
                    <div style={{ marginTop: 2 }}>{e.answer?.text}</div>
                    <div style={{ fontSize: 10.5, opacity: 0.45, marginTop: 2 }}>
                      Quelle: {e.answer?.source} · {e.answer?.period}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => ask(t.id)}
                style={{
                  textAlign: "left",
                  background: "transparent",
                  border: `1.5px solid ${COLORS.ink}44`,
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 12.5,
                  color: COLORS.ink,
                  cursor: "pointer",
                }}
              >
                {t.question}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 10.5, opacity: 0.45, marginTop: 10 }}>
            Phase 1: feste Fragen, immer direkt aus der Datenbank -- keine freie
            Texteingabe (kommt in Phase 2).
          </div>
        </div>
      )}
    </>
  );
}
