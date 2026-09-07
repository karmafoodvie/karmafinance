"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Label, FieldGroup } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { saveShopifyMonthly } from "@/app/(app)/erfassen/shopify/actions";
import { yoyPercent, formatPercent } from "@/lib/calculations";
import type { ShopifyMonthly } from "@/lib/supabase/types";

export function ShopifyMonthlyForm({
  periodStart,
  initial,
  prevYearActual,
}: {
  periodStart: string;
  initial: ShopifyMonthly | null;
  prevYearActual: number | null;
}) {
  const [payout, setPayout] = useState(initial?.payout_amount?.toString() ?? "");
  const [orders, setOrders] = useState(initial?.orders_count?.toString() ?? "");
  const [conversion, setConversion] = useState(
    initial?.conversion_rate != null ? (initial.conversion_rate * 100).toString() : "",
  );
  const [sessions, setSessions] = useState(initial?.sessions?.toString() ?? "");
  const [prevYearManual, setPrevYearManual] = useState(
    initial?.payout_prev_year_manual?.toString() ?? "",
  );
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const effectivePrevYear = prevYearActual ?? (prevYearManual ? Number(prevYearManual) : null);
  const yoy = yoyPercent(payout ? Number(payout) : null, effectivePrevYear);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await saveShopifyMonthly({
        periodStart,
        payoutAmount: payout === "" ? null : Number(payout),
        ordersCount: orders === "" ? null : Number(orders),
        conversionRate: conversion === "" ? null : Number(conversion) / 100,
        sessions: sessions === "" ? null : Number(sessions),
        payoutPrevYearManual: prevYearManual === "" ? null : Number(prevYearManual),
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
    <Card className="max-w-2xl">
      <CardHeader
        title="Shopify Webshop"
        subtitle={
          yoy != null
            ? `${formatPercent(yoy)} ggü. Vorjahr`
            : "Vorjahreswert fehlt für Vergleich"
        }
      />
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <FieldGroup>
          <Label htmlFor="shopify-payout">Auszahlungsbetrag</Label>
          <Input
            id="shopify-payout"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={payout}
            onChange={(e) => setPayout(e.target.value)}
            placeholder="0,00"
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="shopify-orders">Bestellungen</Label>
          <Input
            id="shopify-orders"
            type="number"
            step="1"
            inputMode="numeric"
            value={orders}
            onChange={(e) => setOrders(e.target.value)}
            placeholder="0"
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="shopify-conversion" hint="in %">
            Conversion Rate
          </Label>
          <Input
            id="shopify-conversion"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={conversion}
            onChange={(e) => setConversion(e.target.value)}
            placeholder="0,25"
          />
        </FieldGroup>
        <FieldGroup>
          <Label htmlFor="shopify-sessions">Onlineshop-Sitzungen</Label>
          <Input
            id="shopify-sessions"
            type="number"
            step="1"
            inputMode="numeric"
            value={sessions}
            onChange={(e) => setSessions(e.target.value)}
            placeholder="0"
          />
        </FieldGroup>
        <FieldGroup>
          <Label
            htmlFor="shopify-prevyear"
            hint={prevYearActual != null ? "wird automatisch aus Vorjahresdaten übernommen" : "manuell, falls kein Vorjahr in der DB"}
          >
            Vorjahres-Auszahlung
          </Label>
          <Input
            id="shopify-prevyear"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={prevYearActual != null ? prevYearActual : prevYearManual}
            onChange={(e) => setPrevYearManual(e.target.value)}
            placeholder="0,00"
            disabled={prevYearActual != null}
          />
        </FieldGroup>
        <div className="sm:col-span-2 flex items-center gap-3 mt-1">
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
