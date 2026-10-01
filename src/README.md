# Ampelsystem / Daten-Checkliste für die Finanz-App

## Was das ist

Eine Checkliste mit Ampelsystem (🟢/🟡/🔴), die pro Monat zeigt, ob alle
Datenquellen eingepflegt sind, die die App braucht: Kassensystem
(Tagesumsätze, Gerichte, Produktebene), Wolt, Foodora, B2B-Odoo-Export,
Shopify, Too Good To Go. Zusätzlich ein Verifikations-Block, der die
eingepflegten Kassensystem-Zahlen je Standort gegencheckt (Tagesumsätze vs.
Produktebene-Summe) — damit man nicht nur sieht *dass* etwas da ist, sondern
auch, ob die Summen plausibel zusammenpassen.

Die Logik sitzt in zwei SQL-Functions, die **bereits live auf dem
Supabase-Projekt angelegt sind** (ich habe sie direkt per Migration
angewendet, nicht nur als Datei abgelegt):

- `get_monthly_data_checklist(period_start date)` → eine Zeile pro
  Datenquelle mit Status, Detailtext, letztem Update
- `check_pos_revenue_consistency(period_start date)` → ein Zeile pro
  Standort: Tagesumsatz vs. Produktebene-Summe, Differenz in % und Ampel

Du kannst beide auch direkt im Supabase SQL-Editor testen:
```sql
select * from get_monthly_data_checklist('2026-09-01');
select * from check_pos_revenue_consistency('2026-09-01');
```

## Dateien

```
components/DataChecklist.tsx         Die Ampel-Karte (Checkliste + Verifikation)
lib/data-checklist.ts                Supabase-RPC-Calls + Typen
supabase/migrations/20261001090000_data_checklist_ampelsystem.sql   Repo-Kopie der Migration (schon live)
```

## Wohin im Repo

```
src/components/DataChecklist.tsx
src/lib/data-checklist.ts
supabase/migrations/20261001090000_data_checklist_ampelsystem.sql
```

Die Migration ist **auf der DB schon aktiv** — die Datei im Repo ist nur
dafür da, dass sie bei dir versioniert ist (z.B. falls du sie später per
Supabase-CLI/GitHub-Action mitlaufen lässt). Du musst sie nicht nochmal
ausführen.

## Einbauen

Am einfachsten irgendwo oben auf der Finanzen-Startseite oder in einer
eigenen "Datenstatus"-Sektion:

```tsx
import { DataChecklist } from "@/components/DataChecklist";

<DataChecklist />
```

Die Komponente lädt selbstständig die letzten 4 Monate zur Auswahl (Dropdown
oben rechts) und holt sich die Daten per Supabase-RPC. Kein zusätzliches
Prop nötig.

## Wie die Ampel entscheidet (zum Nachjustieren)

- **Kassensystem (Tagesumsätze/Gerichte)**: zählt, an wie vielen Kalendertagen
  des Monats überhaupt eine Zeile existiert, und vergleicht das mit der
  Anzahl Tage, die der Monat bisher hat. **Wichtiger Hinweis:** das geht
  aktuell von "jeden Tag offen" aus — falls einzelne Standorte an
  bestimmten Wochentagen zu haben, zeigt die Ampel an normalen Monaten eher
  zu oft Gelb statt Grün. Sag mir, an welchen Tagen welcher Standort zu hat,
  dann bau ich das genauer (z.B. nur Werktage erwarten).
- **Produktebene/Wolt/Foodora/B2B/Shopify/TGTG**: einfache
  Vorhanden-ja/nein- bzw. Vollständig-pro-Standort-Prüfung für den gewählten
  Monat.
- **Verifikation (Tagesumsatz vs. Produktebene)**: ≤3% Differenz = Grün,
  ≤8% = Gelb, darüber Rot. Ein kleiner Abstand ist normal, weil Odoo
  Rabatte/Gebühren separat unter der Kategorie "All" führt, nicht unter
  "Shop" — das ist also kein automatischer Fehlerbeweis, sondern ein
  Hinweis zum Gegenchecken.

Beide Schwellenwerte sind in der SQL-Function zentral gesetzt (`v_days_expected`-
Logik bzw. `0.03`/`0.08` in `check_pos_revenue_consistency`) — einfach dort
anpassen, falls sich das nach ein paar Monaten als zu streng/zu locker zeigt.

---

## Status des September-Exports (file-9) — was ich eingepflegt habe

Dein Upload war ein **vollständiger Monats-Export** (Sept 1–30, nicht wie
bisher ein Wochen-Export mit 1-2 Tagen Überlappung). Das war eine gute
Gelegenheit, weil er zwei bisher fehlende Lücken schließt:

- **pos_order_daily**: 23 Zeilen (Sept 7–11, alle 5 Standorte) hatten einen
  falschen "Anzahl Verkaufspositionen"-Wert aus einem früheren Lückenfüllen
  — korrigiert. Die neuen Tage 29./30. September eingefügt (Umsatz/Bestellungen
  stimmen exakt mit deinem Export).
- **pos_product_monthly**: komplett gegen deinen Export abgeglichen und
  aktualisiert — 125 Zeilen aktualisiert (meist: der Monat war bisher nur
  teilweise erfasst, jetzt vollständig), 13 neue Produkte eingefügt. Die
  Summe für "Shop" stimmt jetzt exakt mit deinem Export überein (70.674,45 €).
  Pop-up-Artikel (is_popup=true) wurden dabei nicht angerührt.
- **pos_meal_daily**: die neuen Tage (29. September, 25 Zeilen) eingefügt.

### Ein offener Punkt, den ich NICHT selbst entschieden habe

Beim Gegenchecken von `pos_meal_daily` für Sept 1–28 (Gerichte-Kategorien)
gegen deinen neuen Export ist mir aufgefallen, dass die Kategorie
**"Wochensalat" in deinem Export komplett unter "Catering" statt "Shop"
läuft** (125 verkaufte Portionen diesen Monat, vorher unter "Shop" mit 102
Portionen erfasst). Dazu kommen kleinere Verschiebungen zwischen "Mix
Portion" und "Special" (ca. 130 bzw. 230 Einheiten), vermutlich weil manche
Artikel wie "Mix Portion (Special)" im Produktnamen beides andeuten.

Das betrifft **nur die Tages-Kategorie-Ansicht** ("Gerichte"-Tab), nicht die
Umsatzzahlen selbst (die sind, wie oben, exakt abgeglichen). Ich habe die
bestehenden Sept-1–28-Zeilen in `pos_meal_daily` deshalb bewusst **nicht**
überschrieben, weil unklar ist, ob das eine echte Kanal-Umstellung in Odoo
ist (Wochensalat läuft jetzt über Catering-Bestellungen) oder nur eine
andere Experiment in der Odoo-Datenpflege. Wenn du mir sagst, was stimmt,
passe ich das in einer Minute an.

### Kleinigkeit am Rande

Eine einzelne Geschenkkarten-Buchung bei Börse (1010) weicht um 10,50 €
zwischen altem und neuem Export ab (vermutlich eine nachträgliche Korrektur
in Odoo) — unter 1 Promille vom Monatsumsatz, hab ich nicht weiter verfolgt.

---

## Noch offen (nicht Teil dieser Lieferung)

- **RLS-Sicherheitshinweis**: Supabase meldet 7 Tabellen ohne Row Level
  Security (`pos_product_archive`, `ingredient_prices`, `product_recipes`,
  `product_costing_meta`, `schrankerl_product_costs`,
  `schrankerl_weekly_orders`, `schrankerl_weekly_summary`) — über den
  Anon-Key aktuell voll les-/schreibbar. Sag Bescheid, wenn ich das fixen
  soll (braucht aber vorher eine Entscheidung, welche Policies gelten sollen,
  sonst sperrt RLS den Zugriff komplett).
- Standort "3400 Kitchen" vs. "Inkustraße" — die Zuordnung zu
  `inkustrasse-3400` ist weiterhin nicht von dir final bestätigt.
