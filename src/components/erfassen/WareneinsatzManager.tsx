"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Label, FieldGroup } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import {
  saveProductCost,
  deleteProductCost,
} from "@/app/(app)/wareneinsatz/actions";
import { formatEur, formatNumber } from "@/lib/calculations";
import type { MarginRow } from "@/lib/wareneinsatz";

const VAT_OPTIONS = [10, 13, 20, 0];

function pct(v: number | null) {
  if (v == null) return "–";
  return `${new Intl.NumberFormat("de-AT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(v)} %`;
}

export function WareneinsatzManager({
  rows,
  extraProductNames,
}: {
  rows: MarginRow[];
  /** Produkte mit hinterlegtem Wareneinsatz, aber ohne Verkauf im Zeitraum */
  extraProductNames: string[];
}) {
  const [product, setProduct] = useState("");
  const [cost, setCost] = useState("");
  const [vat, setVat] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);

  const names = useMemo(
    () => Array.from(new Set([...rows.map((r) => r.product), ...extraProductNames])).sort(),
    [rows, extraProductNames],
  );

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!q || r.product.toLowerCase().includes(q)) &&
        (!onlyMissing || r.cost == null),
    );
  }, [rows, filter, onlyMissing]);

  function edit(r: MarginRow) {
    setProduct(r.product);
    setCost(r.cost ? String(r.cost.cost_net).replace(".", ",") : "");
    setVat(r.cost ? String(r.cost.vat_rate) : "");
    setNote(r.cost?.note ?? "");
    setStatus("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    const costNet = Number(cost.replace(",", "."));
    startTransition(async () => {
      const result = await saveProductCost({
        productName: product,
        costNet,
        vatRate: Number(vat),
        note: note || null,
      });
      if (result.ok) {
        setStatus("saved");
        setMessage(null);
        setProduct("");
        setCost("");
        setNote("");
      } else {
        setStatus("error");
        setMessage(result.message);
      }
    });
  }

  function handleDelete(name: string) {
    startTransition(async () => {
      await deleteProductCost(name);
    });
  }

  return (
    <div>
      <Card className="mb-6">
        <CardHeader
          title="Wareneinsatz eintragen"
          subtitle="Einkaufs- bzw. Herstellkosten pro Stück, netto. Bei Lunch Combos die Kosten der ganzen Combo."
        />
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-4"
        >
          <FieldGroup>
            <Label htmlFor="wk-product">Produkt</Label>
            <Input
              id="wk-product"
              list="wk-products"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="z. B. Pona"
              required
            />
            <datalist id="wk-products">
              {names.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="wk-cost" hint="€ netto pro Stück">
              Wareneinsatz
            </Label>
            <Input
              id="wk-cost"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="1,43"
              required
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="wk-vat" hint="des Verkaufspreises">
              Steuersatz
            </Label>
            <Select
              id="wk-vat"
              value={vat}
              onChange={(e) => setVat(e.target.value)}
              required
            >
              <option value="" disabled>
                Bitte wählen
              </option>
              {VAT_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v} %
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="wk-note" hint="optional">
              Notiz
            </Label>
            <Input
              id="wk-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z. B. Lieferant, Stand Oktober 2026"
            />
          </FieldGroup>
          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Speichert …" : "Speichern"}
            </Button>
            {status === "saved" && (
              <span className="text-sm text-ink/60">Gespeichert.</span>
            )}
            {status === "error" && (
              <span className="text-sm text-orange">{message}</span>
            )}
          </div>
        </form>
      </Card>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Produkt suchen"
          className="max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm text-ink/70 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked)}
          />
          nur ohne Wareneinsatz
        </label>
      </div>

      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink/45 border-b border-ink/10">
              <th className="px-4 py-3 font-medium">Produkt</th>
              <th className="px-3 py-3 font-medium text-right">Stück</th>
              <th className="px-3 py-3 font-medium text-right">Ø Preis brutto</th>
              <th className="px-3 py-3 font-medium text-right">Wareneinsatz</th>
              <th className="px-3 py-3 font-medium text-right">Ertrag / Stück</th>
              <th className="px-3 py-3 font-medium text-right">Marge</th>
              <th className="px-3 py-3 font-medium text-right">Ertrag gesamt</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.product} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-2.5 font-medium">{r.product}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatNumber(Math.round(r.quantity))}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {formatEur(r.avgPriceGross, true)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {r.cost ? (
                    <>
                      {formatEur(r.cost.cost_net, true)}
                      <span className="block text-[10px] text-ink/35 leading-tight">
                        USt {r.cost.vat_rate} %
                      </span>
                    </>
                  ) : (
                    <span className="text-ink/25">fehlt</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {r.marginPerUnit != null ? formatEur(r.marginPerUnit, true) : "–"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {pct(r.marginPct)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {r.marginTotal != null ? formatEur(r.marginTotal) : "–"}
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => edit(r)}
                    className="text-xs text-ink/60 hover:text-ink cursor-pointer"
                  >
                    {r.cost ? "Ändern" : "Eintragen"}
                  </button>
                  {r.cost && (
                    <button
                      type="button"
                      onClick={() => handleDelete(r.product)}
                      disabled={isPending}
                      className="ml-3 text-xs text-ink/40 hover:text-orange cursor-pointer"
                    >
                      Löschen
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-ink/40">
                  Keine Produkte gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
