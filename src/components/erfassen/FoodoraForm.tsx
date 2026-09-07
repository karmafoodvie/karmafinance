"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Label, FieldGroup } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { saveFoodoraMonth } from "@/app/(app)/erfassen/lieferdienste/actions";
import type { FoodoraMonthly } from "@/lib/supabase/types";
import type { LocationDef } from "@/lib/constants";

export function FoodoraForm({
  locations,
  periodStart,
  initial,
  initialByLocation,
}: {
  locations: LocationDef[];
  periodStart: string;
  initial: FoodoraMonthly | null;
  initialByLocation: Record<string, number | null>;
}) {
  const [grossSales, setGrossSales] = useState(initial?.gross_sales?.toString() ?? "");
  const [commissionPct, setCommissionPct] = useState(
    initial?.commission_pct != null ? (initial.commission_pct * 100).toString() : "",
  );
  const [commissionAmount, setCommissionAmount] = useState(
    initial?.commission_amount?.toString() ?? "",
  );
  const [payoutTotal, setPayoutTotal] = useState(initial?.payout_total?.toString() ?? "");
  const [ordersCount, setOrdersCount] = useState(initial?.orders_count?.toString() ?? "");
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      locations.map((l) => [l.code, initialByLocation[l.code]?.toString() ?? ""]),
    ),
  );
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await saveFoodoraMonth({
        periodStart,
        grossSales: grossSales === "" ? null : Number(grossSales),
        commissionPct: commissionPct === "" ? null : Number(commissionPct) / 100,
        commissionAmount: commissionAmount === "" ? null : Number(commissionAmount),
        payoutTotal: payoutTotal === "" ? null : Number(payoutTotal),
        ordersCount: ordersCount === "" ? null : Number(ordersCount),
        payouts: locations.map((l) => ({
          locationCode: l.code,
          payoutAmount: values[l.code] === "" ? null : Number(values[l.code]),
        })),
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
      <CardHeader title="Foodora" subtitle="Gesamtwerte + Auszahlung pro Standort" />
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <FieldGroup>
            <Label htmlFor="foodora-gross">Total Gross Sales</Label>
            <Input
              id="foodora-gross"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={grossSales}
              onChange={(e) => setGrossSales(e.target.value)}
              placeholder="0,00"
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="foodora-commission-pct" hint="lt. Vertrag, in %">
              Provision
            </Label>
            <Input
              id="foodora-commission-pct"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              placeholder="14"
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="foodora-commission-amount">Provision (Betrag)</Label>
            <Input
              id="foodora-commission-amount"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={commissionAmount}
              onChange={(e) => setCommissionAmount(e.target.value)}
              placeholder="0,00"
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="foodora-payout">Auszahlungsbetrag (netto)</Label>
            <Input
              id="foodora-payout"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={payoutTotal}
              onChange={(e) => setPayoutTotal(e.target.value)}
              placeholder="0,00"
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="foodora-orders">Bestellungen</Label>
            <Input
              id="foodora-orders"
              type="number"
              step="1"
              inputMode="numeric"
              value={ordersCount}
              onChange={(e) => setOrdersCount(e.target.value)}
              placeholder="0"
            />
          </FieldGroup>
        </div>

        <p className="text-xs font-medium uppercase tracking-wide text-ink/45 mt-4 mb-2">
          Auszahlung pro Standort
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {locations.map((loc) => (
            <FieldGroup key={loc.code}>
              <Label htmlFor={`foodora-${loc.code}`}>{loc.shortName}</Label>
              <Input
                id={`foodora-${loc.code}`}
                type="number"
                step="0.01"
                inputMode="decimal"
                value={values[loc.code]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [loc.code]: e.target.value }))
                }
                placeholder="0,00"
              />
            </FieldGroup>
          ))}
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
