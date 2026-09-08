"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Label, FieldGroup } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { saveTgtgMonth } from "@/app/(app)/erfassen/tgtg/actions";
import { formatEur } from "@/lib/calculations";
import type { TgtgLocationPayout } from "@/lib/supabase/types";

export function TgtgForm({
  locationCode,
  locationName,
  periodStart,
  initial,
}: {
  locationCode: string;
  locationName: string;
  periodStart: string;
  initial: TgtgLocationPayout | null;
}) {
  const [mealsSaved, setMealsSaved] = useState(initial?.meals_saved?.toString() ?? "");
  const [revenueGross, setRevenueGross] = useState(
    initial?.revenue_gross?.toString() ?? "",
  );
  const [feeAmount, setFeeAmount] = useState(initial?.fee_amount?.toString() ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const grossNum = revenueGross === "" ? null : Number(revenueGross);
  const feeNum = feeAmount === "" ? null : Number(feeAmount);
  const netNum = grossNum != null && feeNum != null ? grossNum - feeNum : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await saveTgtgMonth({
        periodStart,
        payouts: [
          {
            locationCode,
            mealsSaved: mealsSaved === "" ? null : Number(mealsSaved),
            revenueGross: grossNum,
            feeAmount: feeNum,
            revenueNet: netNum,
          },
        ],
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
        subtitle={netNum != null ? `Netto: ${formatEur(netNum, true)}` : "noch keine Werte"}
      />
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
        <FieldGroup>
          <Label htmlFor={`${locationCode}-meals`}>Gerettete Sackerl</Label>
          <Input
            id={`${locationCode}-meals`}
            type="number"
            step="1"
            inputMode="numeric"
            value={mealsSaved}
            onChange={(e) => setMealsSaved(e.target.value)}
            placeholder="0"
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor={`${locationCode}-gross`} hint="Verkaufswert">
            Brutto
          </Label>
          <Input
            id={`${locationCode}-gross`}
            type="number"
            step="0.01"
            inputMode="decimal"
            value={revenueGross}
            onChange={(e) => setRevenueGross(e.target.value)}
            placeholder="0,00"
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor={`${locationCode}-fee`} hint="inkl. USt.">
            TGTG-Gebühr
          </Label>
          <Input
            id={`${locationCode}-fee`}
            type="number"
            step="0.01"
            inputMode="decimal"
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            placeholder="0,00"
          />
        </FieldGroup>
        <div className="sm:col-span-3 flex items-center gap-3 mt-1">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Speichere…" : "Speichern"}
          </Button>
          {status === "saved" && <span className="text-sm text-ink/50">Gespeichert ✓</span>}
          {status === "error" && <span className="text-sm text-orange">{message}</span>}
        </div>
      </form>
    </Card>
  );
}
