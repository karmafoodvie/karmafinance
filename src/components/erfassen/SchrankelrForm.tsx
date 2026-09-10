"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Label, FieldGroup } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { saveSchrankelrMonth } from "@/app/(app)/erfassen/lieferdienste/actions";
import { formatEur } from "@/lib/calculations";
import type { SchrankelrMonthly } from "@/lib/supabase/types";

export function SchrankelrForm({
  periodStart,
  initial,
}: {
  periodStart: string;
  initial: SchrankelrMonthly | null;
}) {
  const [unitsSold, setUnitsSold] = useState(initial?.units_sold?.toString() ?? "");
  const [revenueGross, setRevenueGross] = useState(initial?.revenue_gross?.toString() ?? "");
  const [payoutAmount, setPayoutAmount] = useState(initial?.payout_amount?.toString() ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await saveSchrankelrMonth({
        periodStart,
        unitsSold: unitsSold === "" ? null : Number(unitsSold),
        revenueGross: revenueGross === "" ? null : Number(revenueGross),
        payoutAmount: payoutAmount === "" ? null : Number(payoutAmount),
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

  const payout = payoutAmount === "" ? null : Number(payoutAmount);

  return (
    <Card>
      <CardHeader
        title="Schrankerl"
        subtitle={`Auszahlung: ${formatEur(payout, true)}`}
      />
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
          <FieldGroup>
            <Label htmlFor="schrankerl-units">Stück verkauft</Label>
            <Input
              id="schrankerl-units"
              type="number"
              step="1"
              inputMode="numeric"
              value={unitsSold}
              onChange={(e) => setUnitsSold(e.target.value)}
              placeholder="0"
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="schrankerl-gross">Bruttoumsatz (€)</Label>
            <Input
              id="schrankerl-gross"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={revenueGross}
              onChange={(e) => setRevenueGross(e.target.value)}
              placeholder="0,00"
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="schrankerl-payout">Auszahlung (€)</Label>
            <Input
              id="schrankerl-payout"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder="0,00"
            />
          </FieldGroup>
        </div>
        <div className="flex items-center gap-3 mt-1">
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
