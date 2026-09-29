# Wochentrend-Popup — Integrationsanleitung

Zeigt nach neuen Kassendaten automatisch ein Popup mit Trendchart (letzte 8 Wochen)
und einer Ein-Satz-Zusammenfassung ("Diese Woche bisher X €, Vorwoche Y € — +/-Z%").

## Was schon fertig & live ist

Die Postgres-Funktion `weekly_revenue_trend(p_locations text[], p_week_count int)`
ist bereits in der Supabase-Datenbank angelegt und funktioniert — getestet, liefert
korrekte Werte. Sie aggregiert `pos_order_daily` pro ISO-Kalenderwoche (Mo–Fr) für
die übergebenen Standorte. Da diese Datei über die Supabase-Migration eingespielt
wurde, muss nichts mehr in der Datenbank gemacht werden.

## Was du einbauen musst

Vier Dateien liegen in diesem Paket:

```
lib/weekly-trend.ts              Datenlogik (ruft die Supabase-Funktion auf)
components/WeeklyTrendPopup.tsx  Das Popup selbst (Chart + Text)
hooks/useNewDataPopup.ts         Erkennt "neue Daten seit letztem Besuch"
SELF-PROMPT.md                   Mein eigener Auftrag/Spec für dieses Feature
```

Kopiere `lib/`, `components/`, `hooks/` in dein Projekt (z.B. unter `src/` oder
wo bei dir sonst Komponenten liegen — ich kenne deine genaue Ordnerstruktur nicht,
da ich keinen Repo-Zugriff habe).

### 1. Supabase-Client

In `lib/weekly-trend.ts` erzeugt die Datei sich aktuell einen eigenen Supabase-Client
als Fallback. Ersetze das durch deinen bestehenden Client:

```ts
// vorher (Fallback in der Datei):
const supabase = getClient();

// nachher, z.B.:
import { supabase } from "@/lib/supabase"; // dein bestehender Client
```

Die Stelle ist mit `// TODO(integration)` markiert.

### 2. Popup irgendwo im Layout einhängen

Am einfachsten in deinem obersten Layout (z.B. `app/layout.tsx` oder wo bei dir das
Dashboard gerendert wird):

```tsx
import { WeeklyTrendPopup } from "@/components/WeeklyTrendPopup";
import { useNewDataPopup } from "@/hooks/useNewDataPopup";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { shouldShowPopup, dismiss } = useNewDataPopup();

  return (
    <>
      {children}
      <WeeklyTrendPopup open={shouldShowPopup} onClose={dismiss} />
    </>
  );
}
```

Das Popup checkt beim Laden automatisch, ob es neue Daten seit dem letzten Besuch
gibt (via `localStorage`, pro Browser/Gerät), und zeigt sich nur dann. Nach dem
Schließen (`dismiss()`) merkt es sich die aktuelle Datenversion, damit es nicht
sofort wieder aufpoppt.

### 3. Styling / Fonts

Ich habe die Karma-Food-CI-Farben (Neongelb #D4FF3F, Orange #E94E1B, Dark Ink
#1B1B14, Cream #FAF6EA) und die Fonts (Boldonse für die Überschrift, Geist für
den Rest) direkt als Inline-Styles reingeschrieben, weil ich dein Styling-System
(Tailwind? CSS Modules? etwas eigenes?) nicht kenne. Wenn du z.B. Tailwind nutzt,
kannst du die Inline-Styles 1:1 durch Klassen ersetzen — die Logik bleibt gleich.
Die Boldonse-Stelle ist mit `// TODO(integration)` markiert, falls der Font bei dir
schon global eingebunden ist und einen anderen Namen/Import braucht.

## Warum ich es so gebaut habe

Ich habe keinen direkten Zugriff auf dein GitHub-Repo (du lädst ZIPs selbst hoch
und deployst über Vercel) und kenne daher die genaue Ordnerstruktur, dein
Styling-System und deinen bestehenden Supabase-Client-Import nicht. Deshalb ist
das Paket bewusst eigenständig und dependency-arm gehalten (eigene SVG-Chart-
Komponente statt einer Chart-Library, die bei dir vielleicht nicht installiert
ist) — alle Stellen, die an deine echte App angepasst werden müssen, sind mit
`// TODO(integration)` markiert. Details dazu stehen in `SELF-PROMPT.md`.

## Falls du das Popup lieber manuell auslösbar willst

Falls "automatisch beim Login" zu aufdringlich ist, kannst du `shouldShowPopup`
auch komplett ignorieren und stattdessen einen Button "Wochentrend anzeigen"
bauen, der `open` direkt auf `true` setzt — die Komponente selbst braucht das
localStorage-Zeug nicht zwingend.

## Offene Frage von meiner Seite

Ich bin mir bei der Zuordnung "3400 Kitchen" → `inkustrasse-3400` immer noch nicht
zu 100% sicher (hat sich aus dem Kontext ergeben, aber du hast es nie explizit
bestätigt). Falls das falsch ist, sag Bescheid — betrifft dann auch alle bisherigen
Auswertungen, nicht nur dieses Feature.
