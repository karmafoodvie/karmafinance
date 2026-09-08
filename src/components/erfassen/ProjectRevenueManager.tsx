"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Label, FieldGroup } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { MONTH_NAMES, SELECTABLE_YEARS, monthLabel, periodStart as toPeriodStart } from "@/lib/constants";
import { formatEur, sum } from "@/lib/calculations";
import { saveProjectRevenue, deleteProjectRevenue } from "@/app/(app)/erfassen/projekte/actions";
import type { ProjectRevenue } from "@/lib/supabase/types";

function periodLabel(periodStart: string) {
  const [year, month] = periodStart.split("-").map(Number);
  return `${monthLabel(month)} ${year}`;
}

export function ProjectRevenueManager({ entries }: { entries: ProjectRevenue[] }) {
  const now = new Date();
  const [projectName, setProjectName] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [revenueNet, setRevenueNet] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const knownProjectNames = useMemo(
    () => Array.from(new Set(entries.map((e) => e.project_name))).sort(),
    [entries],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ProjectRevenue[]>();
    for (const e of entries) {
      const list = map.get(e.project_name) ?? [];
      list.push(e);
      map.set(e.project_name, list);
    }
    return Array.from(map.entries())
      .map(([name, rows]) => ({
        name,
        rows: rows.sort((a, b) => (a.period_start < b.period_start ? 1 : -1)),
        total: sum(rows.map((r) => r.revenue_net)),
      }))
      .sort((a, b) => (a.rows[0]?.period_start < b.rows[0]?.period_start ? 1 : -1));
  }, [entries]);

  const grandTotal = sum(entries.map((e) => e.revenue_net));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await saveProjectRevenue({
        projectName: projectName.trim(),
        periodStart: toPeriodStart(year, month),
        revenueNet: revenueNet === "" ? null : Number(revenueNet),
        note: note || null,
      });
      if (result.ok) {
        setStatus("saved");
        setMessage(null);
        setRevenueNet("");
        setNote("");
      } else {
        setStatus("error");
        setMessage(result.message);
      }
    });
  }

  function handleDelete(id: string) {
    setPendingDeleteId(id);
    startTransition(async () => {
      await deleteProjectRevenue(id);
      setPendingDeleteId(null);
    });
  }

  return (
    <div>
      <Card className="mb-6">
        <CardHeader
          title="Neuer Eintrag"
          subtitle="Projekt-/Standortname frei wählbar — z.B. VDW, IST, ein Pop-up-Name oder eine Kooperation"
        />
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <FieldGroup>
            <Label htmlFor="project-name">Projekt / Standort</Label>
            <Input
              id="project-name"
              list="known-project-names"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="z. B. VDW"
              required
            />
            <datalist id="known-project-names">
              {knownProjectNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="project-revenue">Umsatz netto</Label>
            <Input
              id="project-revenue"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={revenueNet}
              onChange={(e) => setRevenueNet(e.target.value)}
              placeholder="0,00"
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="project-month">Monat</Label>
            <div className="flex items-center gap-2">
              <Select
                id="project-month"
                aria-label="Monat"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </Select>
              <Select
                aria-label="Jahr"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {SELECTABLE_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="project-note" hint="optional">
              Notiz
            </Label>
            <Input
              id="project-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z. B. Kooperation mit …"
            />
          </FieldGroup>
          <div className="sm:col-span-2 flex items-center gap-3 mt-1">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Speichere…" : "Eintragen"}
            </Button>
            {status === "saved" && <span className="text-sm text-ink/50">Gespeichert ✓</span>}
            {status === "error" && <span className="text-sm text-orange">{message}</span>}
          </div>
        </form>
      </Card>

      {entries.length === 0 ? (
        <Card>
          <p className="text-sm text-ink/50 py-6 text-center">
            Noch keine Projekte/Pop-ups erfasst.
          </p>
        </Card>
      ) : (
        <>
          <p className="text-sm text-ink/50 mb-4">
            Gesamt über alle Projekte: <span className="font-medium text-ink/80">{formatEur(grandTotal, true)}</span>
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {grouped.map((group) => (
              <Card key={group.name}>
                <CardHeader
                  title={group.name}
                  subtitle={`Summe: ${formatEur(group.total, true)}`}
                />
                <div className="space-y-2">
                  {group.rows.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-start justify-between gap-3 text-sm border-b border-ink/5 pb-2 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-ink/80">{periodLabel(row.period_start)}</p>
                        <p className="text-ink/50">{formatEur(row.revenue_net, true)}</p>
                        {row.note && <p className="text-ink/40 text-xs mt-0.5">{row.note}</p>}
                      </div>
                      <button
                        onClick={() => handleDelete(row.id)}
                        disabled={isPending && pendingDeleteId === row.id}
                        className="text-xs text-ink/30 hover:text-orange transition-colors cursor-pointer shrink-0"
                      >
                        {isPending && pendingDeleteId === row.id ? "…" : "Löschen"}
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
