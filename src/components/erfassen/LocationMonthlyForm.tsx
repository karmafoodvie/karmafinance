"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Label, FieldGroup } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { saveLocationMonthly } from "@/app/(app)/erfassen/standorte/actions";
import { yoyPercent, formatPercent } from "@/lib/calculations";
import type { LocationMonthly } from "@/lib/supabase/types";

export function LocationMonthlyForm({
  locationCode,
  locationName,
  periodStart,
  initial,
  prevYearActual,
}: {
  locationCode: string;
  locationName: string;
  periodStart: string;
  initial: LocationMonthly | null;
  prevYearActual: number | null;
}) {
  const [revenueNet, setRevenueNet] = useState(initial?.revenue_net?.toString() ?? "");
  const [discounts, setDiscounts] = useState(initial?.discounts_total?.toString() ?? "");
  const [prevYearManual, setPrevYearManual] = useState(
    initial?.revenue_prev_year_manual?.toString() ?? "",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const effectivePrevYear = prevYearActual ?? (prevYearManual ? Number(prevYearManual) : null);
  const yoy = yoyPercent(revenueNet ? Number(revenueNet) : null, effectivePrevYear);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await saveLocationMonthly({
        locationCode,
        periodStart,
        revenueNet: revenueNet === "" ? null : Number(revenueNet),
        discountsTotal: discounts === "" ? null : Number(discounts),
        revenuePrevYearManual: prevYearManual === "" ? null : Number(prevYearManual),
        note: note || null,
      });
      if (result.ok) {
        setStatus("saved");
        setMessage(null);
      } else {
        setStatus("error");
        setMessage(result.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader
        title={locationName}
        subtitle={
          yoy != null
            ? `${formatPercent(yoy)} ggü. Vorjahr`
            : "Vorjahreswert fehlt für Vergleich"
        }
      />
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <FieldGroup>
          <Label htmlFor={`${locationCode}-revenue`}>Umsatz netto (nach Rabatten)</Label>
          <Input
            id={`${locationCode}-revenue`}
            type="number"
            step="0.01"
            inputMode="decimal"
            value={revenueNet}
            onChange={(e) => setRevenueNet(e.target.value)}
            placeholder="0,00"
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor={`${locationCode}-discounts`}>Rabatte gesamt</Label>
          <Input
            id={`${locationCode}-discounts`}
            type="number"
            step="0.01"
            inputMode="decimal"
            value={discounts}
            onChange={(e) => setDiscounts(e.target.value)}
            placeholder="0,00"
          />
        </FieldGroup>
        <FieldGroup>
          <Label
            htmlFor={`${locationCode}-prevyear`}
            hint={prevYearActual != null ? "wird automatisch aus Vorjahresdaten übernommen" : "manuell, falls kein Vorjahr in der DB"}
          >
            Vorjahreswert
          </Label>
          <Input
            id={`${locationCode}-prevyear`}
            type="number"
            step="0.01"
            inputMode="decimal"
            value={prevYearActual != null ? prevYearActual : prevYearManual}
            onChange={(e) => setPrevYearManual(e.target.value)}
            placeholder="0,00"
            disabled={prevYearActual != null}
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor={`${locationCode}-note`} hint="optional">
            Notiz
          </Label>
          <Input
            id={`${locationCode}-note`}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z. B. Special Event"
          />
        </FieldGroup>
        <div className="sm:col-span-2 flex items-center gap-3 mt-1">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Speichere…" : "Speichern"}
          </Button>
          {status === "saved" && (
            <span className="text-sm text-ink/50">Gespeichert ✓</span>
          )}
          {status === "error" && (
            <span className="text-sm text-orange">{message}</span>
          )}
        </div>
      </form>
    </Card>
  );
}
