"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Label, FieldGroup } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { saveWoltMonth } from "@/app/(app)/erfassen/lieferdienste/actions";
import { sum, formatEur } from "@/lib/calculations";
import type { LocationDef } from "@/lib/constants";

export function WoltForm({
  locations,
  periodStart,
  initialByLocation,
}: {
  locations: LocationDef[];
  periodStart: string;
  initialByLocation: Record<string, number | null>;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      locations.map((l) => [l.code, initialByLocation[l.code]?.toString() ?? ""]),
    ),
  );
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = sum(Object.values(values).map((v) => (v === "" ? null : Number(v))));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await saveWoltMonth({
        periodStart,
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
      <CardHeader
        title="Wolt"
        subtitle={`Auszahlung gesamt: ${formatEur(total, true)}`}
      />
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {locations.map((loc) => (
            <FieldGroup key={loc.code}>
              <Label htmlFor={`wolt-${loc.code}`}>{loc.shortName}</Label>
              <Input
                id={`wolt-${loc.code}`}
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
