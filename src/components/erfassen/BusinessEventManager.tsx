"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Label, FieldGroup } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { saveBusinessEvent, deleteBusinessEvent } from "@/app/(app)/erfassen/ereignisse/actions";
import type { BusinessEvent } from "@/lib/supabase/types";
import type { LocationDef } from "@/lib/constants";

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,\s]+/)
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean),
    ),
  );
}

export function BusinessEventManager({
  events,
  locations,
}: {
  events: BusinessEvent[];
  locations: LocationDef[];
}) {
  const [eventDate, setEventDate] = useState(todayIso());
  const [locationCode, setLocationCode] = useState("");
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const locationByCode = useMemo(
    () => Object.fromEntries(locations.map((l) => [l.code, l.name])),
    [locations],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) for (const t of e.tags) set.add(t);
    return Array.from(set).sort();
  }, [events]);

  const filteredEvents = useMemo(
    () => (tagFilter ? events.filter((e) => e.tags.includes(tagFilter)) : events),
    [events, tagFilter],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await saveBusinessEvent({
        eventDate,
        locationCode: locationCode || null,
        title: title.trim(),
        note: note || null,
        tags: parseTags(tagsInput),
      });
      if (result.ok) {
        setStatus("saved");
        setMessage(null);
        setTitle("");
        setTagsInput("");
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
      await deleteBusinessEvent(id);
      setPendingDeleteId(null);
    });
  }

  return (
    <div>
      <Card className="mb-6">
        <CardHeader
          title="Neue Notiz"
          subtitle="Alles, was Einfluss auf den Umsatz gehabt haben könnte — je mehr, desto besser"
        />
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <FieldGroup>
            <Label htmlFor="event-date">Datum</Label>
            <Input
              id="event-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="event-location" hint="optional">
              Standort
            </Label>
            <Select
              id="event-location"
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
            >
              <option value="">Allgemein (kein bestimmter Standort)</option>
              {locations.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="event-title">Was war los?</Label>
            <Input
              id="event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Vitrine aufgebaut"
              required
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="event-tags" hint="mit Leerzeichen oder Komma getrennt">
              Tags
            </Label>
            <Input
              id="event-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="z. B. umbau, menü"
            />
          </FieldGroup>
          <div className="sm:col-span-2">
            <FieldGroup>
              <Label htmlFor="event-note" hint="optional">
                Notiz
              </Label>
              <Input
                id="event-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Details, falls nötig"
              />
            </FieldGroup>
          </div>
          <div className="sm:col-span-2 flex items-center gap-3 mt-1">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Speichere…" : "Eintragen"}
            </Button>
            {status === "saved" && <span className="text-sm text-ink/50">Gespeichert ✓</span>}
            {status === "error" && <span className="text-sm text-orange">{message}</span>}
          </div>
        </form>
      </Card>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <button
            onClick={() => setTagFilter(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
              tagFilter === null ? "bg-ink text-neon" : "bg-ink/5 text-ink/60 hover:bg-ink/10"
            }`}
          >
            Alle
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                tagFilter === tag ? "bg-ink text-neon" : "bg-ink/5 text-ink/60 hover:bg-ink/10"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {filteredEvents.length === 0 ? (
        <Card>
          <p className="text-sm text-ink/50 py-6 text-center">
            {events.length === 0 ? "Noch keine Ereignisse erfasst." : "Kein Eintrag mit diesem Tag."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((e) => (
            <Card key={e.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-ink/40">
                    {formatDate(e.event_date)}
                    {e.location_code && (
                      <> · {locationByCode[e.location_code] ?? e.location_code}</>
                    )}
                  </p>
                  <p className="font-medium text-ink/80 mt-0.5">{e.title}</p>
                  {e.note && <p className="text-sm text-ink/50 mt-1">{e.note}</p>}
                  {e.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {e.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-neon/30 text-ink/70 px-2.5 py-0.5 text-xs font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  disabled={isPending && pendingDeleteId === e.id}
                  className="text-xs text-ink/30 hover:text-orange transition-colors cursor-pointer shrink-0"
                >
                  {isPending && pendingDeleteId === e.id ? "…" : "Löschen"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
