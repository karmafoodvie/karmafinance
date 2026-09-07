# Karma Food — Finanzübersicht

Eigenständige Web-App als Ersatz für die bisherige Excel-Finanzübersicht.
Komplett getrennt vom operativen Tool: eigenes Repo, eigene Supabase-
Instanz (eigene DB + eigenes Auth), eigenes Deployment. Zugriff nur für
die Geschäftsführung.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 ·
Supabase (Postgres + Auth) · Recharts.

## MVP-Umfang

- Standorte / Lunch-Locations, einzeln pro Standort (Börse, Laurenzerberg,
  Ausstellungsstraße, Stadtplatz, Inkustraße — alle 1010/1020/3400;
  Neustiftgasse als historischer, nicht mehr erfasster Standort)
- Shopify Webshop
- Lieferdienste: Wolt (pro Standort) und Foodora (Gesamt + pro Standort)
- Dashboard mit Umsatzverlauf, Standort- und Stream-Vergleich, YoY-%
- Login über Supabase Auth (E-Mail + Passwort), Zugriff nur für Rolle `admin`

**Ausbaustufe 2** (noch nicht gebaut): Too Good To Go, Schrankerl,
Stadtgemeinde-Umsatz, Marketingaktionen, Social-Quality-Metriken. Kommen
als eigene Migrationen + Formulare dazu, sobald die Basis läuft.

## Setup

```bash
npm install
cp .env.example .env.local   # Werte s. unten
npm run dev
```

`.env.local` (Werte stehen im Supabase-Projekt "Karma Food Finanzen" →
Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

## Datenbank

Schema liegt in `supabase/migrations/0001_init.sql` und ist bereits auf
das produktive Supabase-Projekt **"Karma Food Finanzen"** (eigene, von
der operativen App komplett getrennte Instanz in der Karma-Food-Org)
angewendet.

Neue Migration hinzufügen (z. B. für Ausbaustufe 2):

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase migration new <name>
# SQL schreiben, dann:
npx supabase db push
```

### Rollen & Zugriff

- Jeder neue Supabase-Auth-User bekommt automatisch eine Zeile in
  `public.profiles` (Trigger `on_auth_user_created`), Default-Rolle
  `admin`.
- `admin` sieht/bearbeitet alle Finanzdaten (RLS-Policies in der
  Migration).
- `limited` ist als Rolle vorbereitet (z. B. für Dinesh mit
  Sonderrechten), hat aktuell aber **keinen** Zugriff auf die
  Finanztabellen — der genaue Umfang seiner Rechte war beim Bau noch
  nicht definiert. Wenn der feststeht: neue RLS-Policy(s) in einer
  eigenen Migration ergänzen, nicht `limited` pauschal freischalten.

### Neue Nutzer:innen anlegen

Aktuell am einfachsten über die Supabase-Dashboard-UI des Projekts
("Karma Food Finanzen" → Authentication → Add user → mit Passwort, "Auto
Confirm User" aktivieren). Das Profil wird automatisch angelegt.

Für Adi, Simone und Ines sind die Accounts noch nicht angelegt — dafür
fehlten beim Bau die E-Mail-Adressen. Gurls Account
(hallo@karmafood.at) ist bereits angelegt, Temp-Passwort wurde separat
mitgeteilt — bitte gleich nach dem ersten Login ändern (Supabase
Dashboard → Authentication → User → Reset Password, oder eine
Passwort-vergessen-Seite ergänzen, die gibt's im MVP noch nicht).

## Wöchentliche Erfassung (später)

Die Tabellen haben schon eine `period_type`-Spalte (`monthly` | `weekly`)
und `period_start` als Datum statt Jahr/Monat-Zahlen — wöchentliche
Erfassung lässt sich ergänzen, ohne das Schema zu ändern (nur UI +
Server Actions für `period_type='weekly'` ergänzen).

## Vorjahresvergleich

Wo möglich wird der Vorjahreswert automatisch aus echten Daten der DB
gezogen (z. B. sobald 2027-Daten erfasst werden, greift der Vergleich zu
2026 automatisch). Für den Start, wo die 2025er-Werte nur in der alten
Excel-Datei existieren, gibt es bei Standorten und Shopify ein manuelles
Vorjahresfeld als Fallback/Backfill.

## Design

Neongelb `#D4FF3F`, Orange `#E94E1B` sind die vorgegebenen Markenfarben.
Für "Dark Ink" und "Cream" waren keine exakten Hex-Werte spezifiziert —
aktuell gesetzt: Dark Ink `#1B1B14`, Cream `#FAF6EA` (einzige Stelle:
`src/app/globals.css`, ganz oben). Headings: Boldonse, Fließtext: Geist
(beide selbst gehostet über npm-Pakete, kein Google-Fonts-Laufzeit-Call
nötig).

Chart-Farben sind mit dem Anthropic-`dataviz`-Skill-Validator gegen den
Cream-Hintergrund geprüft (Kontrast/Colorblind-Safety) —
`src/lib/chartColors.ts`. Slot 2 ist auf Marken-Orange gesetzt, Rest ist
das validierte Default-Set. Bitte nicht einzelne Hex-Werte ändern, ohne
den Validator erneut laufen zu lassen (Reihenfolge ist der
CVD-Sicherheitsmechanismus).

## Deployment (Vercel)

1. Repo zu GitHub pushen (siehe Anleitung, die separat mitgeliefert wurde).
2. In Vercel: "Add New Project" → Repo importieren.
3. Environment Variables setzen (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) — Werte wie oben.
4. Deploy. Framework wird automatisch erkannt (Next.js).

Kein Vercel-Zugriff war beim Bau verfügbar — Repo ist deploy-fertig,
Deployment selbst noch offen.

## Smoke-Test (optional)

```bash
npx playwright install chromium
SMOKE_EMAIL=du@karmafood.at SMOKE_PASSWORD=... node scripts/smoke-test.mjs
# optional gegen ein Vercel-Preview: SMOKE_BASE_URL=https://...
```

Prüft Login, Dashboard, alle drei Erfassen-Seiten und Logout end-to-end.
Wurde beim Bau nicht in dieser Form live durchlaufen, weil die
Build-Umgebung keinen allgemeinen Internetzugriff hatte (nur zur
npm-Registry & zur Supabase-API via MCP). Build/Typecheck/Lint sind
sauber, Schema + Auto-Profil-Trigger + Upsert-Logik sind direkt gegen
die produktive DB verifiziert. Bitte diesen Smoke-Test einmal nach dem
ersten Deploy laufen lassen.

## Struktur

```
src/
  app/
    login/                    Login-Seite
    (app)/                    geschützter Bereich (Auth-Guard im Layout)
      dashboard/
      erfassen/standorte/
      erfassen/shopify/
      erfassen/lieferdienste/
  components/
    ui/                       Button, Card, Input, Select, StatTile, …
    charts/                   Recharts-Wrapper mit validierter Palette
    erfassen/                 Formulare pro Stream
    nav/                      Sidebar
  lib/
    supabase/                 Client-/Server-/Middleware-Setup + Typen
    constants.ts              Standorte, Monate, Jahre
    calculations.ts           YoY-%, Formatierung — zentral, keine
                               verstreuten Formeln
    data.ts                   Datenzugriff (Server Components)
    dashboard.ts               Aggregation für die Dashboard-Charts
    auth.ts                   aktuelles Profil laden
supabase/migrations/0001_init.sql
```
