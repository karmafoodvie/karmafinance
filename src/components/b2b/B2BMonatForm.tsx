"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Label, FieldGroup } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { saveB2BMonth } from "@/app/(app)/b2b/actions";
import { sum, formatEur } from "@/lib/calculations";
import { MONTH_NAMES, SELECTABLE_YEARS } from "@/lib/constants";

export interface FormChannel {
  channel_key: string;
  label: string;
  channel_group: string;
  color: string;
}

export function B2BMonatForm({
  channels,
  year,
  month,
  initial,
}: {
  channels: FormChannel[];
  year: number;
  month: number;
  initial: Record<string, number | null>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      channels.map((c) => [c.channel_key, initial[c.channel_key]?.toString() ?? ""]),
    ),
  );
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isNavigating, startNav] = useTransition();

  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;

  // Monat/Jahr laufen über die URL, damit der Server die bestehenden Werte
  // für genau diesen Monat nachlädt. Die Seite gibt der Komponente dazu ein
  // key={periodStart} mit, sodass die Eingabefelder neu aufgebaut werden —
  // sonst stünden hier noch die Zahlen des vorigen Monats und würden beim
  // Speichern in den neuen geschrieben.
  function setPeriod(nextYear: number, nextMonth: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("fy", String(nextYear));
    params.set("fm", String(nextMonth));
    startNav(() => {
      router.push(`${pathname}?${params.toString()}`);
      router.refresh();
    });
  }

  const b2bTotal = sum(
    channels
      .filter((c) => c.channel_group !== "catering")
      .map((c) => (values[c.channel_key] === "" ? null : Number(values[c.channel_key]))),
  );
  const cateringTotal = sum(
    channels
      .filter((c) => c.channel_group === "catering")
      .map((c) => (values[c.channel_key] === "" ? null : Number(values[c.channel_key]))),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await saveB2BMonth({
        periodStart,
        values: channels.map((c) => ({
          channelKey: c.channel_key,
          revenueNet:
            values[c.channel_key] === "" ? null : Number(values[c.channel_key]),
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

  const handel = channels.filter((c) => c.channel_group === "handel");
  const vending = channels.filter((c) => c.channel_group === "vending");
  const catering = channels.filter((c) => c.channel_group === "catering");

  function renderFields(list: FormChannel[]) {
    return list.map((c) => (
      <FieldGroup key={c.channel_key}>
        <Label htmlFor={`b2b-${c.channel_key}`}>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: c.color }}
            />
            {c.label}
          </span>
        </Label>
        <Input
          id={`b2b-${c.channel_key}`}
          type="number"
          step="0.01"
          inputMode="decimal"
          value={values[c.channel_key] ?? ""}
          onChange={(e) =>
            setValues((v) => ({ ...v, [c.channel_key]: e.target.value }))
          }
          placeholder="0,00"
        />
      </FieldGroup>
    ));
  }

  return (
    <Card>
      <CardHeader
        title={`Monatswerte eintragen — ${MONTH_NAMES[month - 1]} ${year}`}
        subtitle={`B2B ${formatEur(b2bTotal, true)} · Catering ${formatEur(cateringTotal, true)} — Nettobeträge aus dem Odoo-Verkaufsbericht`}
      />

      {/* Breiten sitzen auf den Wrapper-Divs: Select bringt intern w-full mit. */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-xs text-ink/40">Monat</span>
        <div className="w-40">
          <Select
            aria-label="Monat"
            value={month}
            disabled={isNavigating}
            onChange={(e) => setPeriod(year, Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-28">
          <Select
            aria-label="Jahr"
            value={year}
            disabled={isNavigating}
            onChange={(e) => setPeriod(Number(e.target.value), month)}
          >
            {SELECTABLE_YEARS.map((yy) => (
              <option key={yy} value={yy}>
                {yy}
              </option>
            ))}
          </Select>
        </div>
        {isNavigating && <span className="text-xs text-ink/35">lädt…</span>}
      </div>

      <form onSubmit={handleSubmit}>
        <p className="text-xs font-medium uppercase tracking-wide text-ink/40 mb-2">
          Handel
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {renderFields(handel)}
        </div>

        <p className="text-xs font-medium uppercase tracking-wide text-ink/40 mt-4 mb-2">
          Kühlschränke
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {renderFields(vending)}
        </div>

        <p className="text-xs font-medium uppercase tracking-wide text-ink/40 mt-4 mb-2">
          Catering{" "}
          <span className="normal-case font-normal">
            — eigenes Geschäft, kein B2B
          </span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {renderFields(catering)}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button type="submit" disabled={isPending || isNavigating}>
            {isPending ? "Speichere…" : "Speichern"}
          </Button>
          {status === "saved" && (
            <span className="text-sm text-ink/50">Gespeichert ✓</span>
          )}
          {status === "error" && <span className="text-sm text-orange">{message}</span>}
        </div>
      </form>
    </Card>
  );
}
