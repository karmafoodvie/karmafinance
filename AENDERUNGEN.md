# Prozentwerte korrigiert + Lieferdienste-Dashboard

Dieses ZIP enthält zwei Dinge: das neue Lieferdienste-Dashboard (wie
besprochen) und die Korrektur der Prozent-/Vorjahresrechnung in der ganzen App.

## Einspielen

1. Ordner `src/` aus dem ZIP über den gleichnamigen Ordner im Repo kopieren
   (alles überschreiben). Keine Datenbank-Änderung nötig.
2. **Diese Dateien löschen** — sie werden durch die neue Lieferdienste-Seite
   ersetzt und sind sonst toter Code:
   - `src/app/(app)/erfassen/lieferdienste/uebersicht/` (ganzer Ordner)
   - `src/components/charts/LieferdiensteCharts.tsx`
   - `src/components/erfassen/WoltForm.tsx`
   - `src/components/erfassen/FoodoraForm.tsx`
   - `src/components/erfassen/LieferdiensteTabs.tsx`
3. Committen und pushen — lokal mit `npm run build` geprüft.

## Teil 1: Was an den Zahlen falsch war

**Foodora lief überall mit 0 € mit.** Der Umsatz steht in
`foodora_location_payout`, die App hat aber `foodora_monthly` gelesen — und
diese Tabelle hat null Zeilen. Dadurch fehlten 10.722 € Lieferdienst-Umsatz in
jeder Auswertung. Die Kachel „Lieferdienste" im Dashboard zeigte für die
letzten 12 Monate 4.362 € statt 14.167 €.

**Fehlende Vorjahresdaten wurden als 0 € verrechnet.** Für die
Lunch-Locations liegen erst ab Jänner 2025 Zahlen vor; die Standorte gab es
aber vorher auch. Die App hat Okt–Dez 2024 trotzdem als „Vorjahr" mitgerechnet
— mit fast leerem Wert. Ergebnis: „Umsatz gesamt −3,8 % vs. Vorjahr", während
der saubere Vergleich −14,5 % ergibt. Auf der Lieferdienste-Seite hätte
derselbe Fehler „+933 %" bei Wolt produziert (12 Monate gegen einen einzigen
erfassten Vorjahresmonat), im Jahresvergleich stand „Lieferdienste +1.645 %".

**Der laufende Monat wurde voll mitgezählt.** September 2026 ist halb vorbei
(15.476 € statt ~70.000 € Schnitt) und lief gegen einen vollen Vorjahresmonat.

**Zwei verschiedene „Gesamtumsätze" auf einer Seite.** Die Kachel oben
enthielt B2B und Catering, der Jahresvergleich direkt darunter nicht — das
sind für Jän–Aug 2026 858.183 € gegen 599.903 € und −14,5 % gegen −7,1 %.

**Die TGTG-Seite hat den Zeitraum anders interpretiert.** Dort zeigten die
Kacheln nur den letzten Monat des gewählten Zeitraums, überall sonst die
Summe. Bei identischer Zeitraumauswahl stand im Dashboard 7.649 € und auf der
TGTG-Seite „–".

**Vier Prozent-Schreibweisen** nebeneinander: `+49.1%`, `+49%`, `12.3 %`,
`2.34%` — mit englischem Dezimalpunkt neben österreichischen Eurobeträgen.

**Der „Trend" in der Produkttabelle** verglich bei ungerader Monatszahl 7
Monate gegen 6 und sah dadurch systematisch zu gut aus.

## Teil 2: Was jetzt gilt

Neue Datei `src/lib/vergleich.ts` — **eine** Stelle für alle
Vorjahresvergleiche der App. Zwei Regeln:

1. Ein Monat kommt nur in den Vergleich, wenn er **in beiden Jahren erfasst**
   ist. Fehlende Daten sind keine Null.
2. Der **laufende Monat** bleibt außen vor (er bleibt aber in der Summe, die
   der gewählte Zeitraum zeigt).

Jeder Prozentwert nennt sein Vergleichsfenster: „▼ −14,5 % vs. Jän–Aug 25".
Kein Prozentwert ohne Basis. Die Kachel-Infotexte schreiben zusätzlich aus,
wie viele Monate verglichen wurden.

Dazu eine einzige Anzeige-Komponente `YoyBadge` (in `StatTile.tsx`), die auf
allen Seiten und in allen Tabellen verwendet wird: neon = Wachstum, orange =
Rückgang, grau = kein Vergleich, ▲/▼ zusätzlich zur Farbe, immer
österreichisches Format mit einer Nachkommastelle.

Der „Trend" in der Produkttabelle heißt jetzt „Trend im Zeitraum", vergleicht
gleich lange Hälften und benutzt bewusst NICHT das Vorjahres-Badge — damit die
beiden Prozentarten nicht verwechselt werden.

## Teil 3: Lieferdienste

`/lieferdienste` ersetzt die alte Erfassen-Seite (Details wie besprochen:
Zeitraum, Vorjahr, Kanal-Chart, Tabellen pro Kanal und Standort). Der alte
Link `/erfassen/lieferdienste` leitet automatisch weiter.

Die Kachel „Bestellungen" ist raus: Wolt liefert keine Bestellanzahl, und die
einzige Tabelle mit Foodora-Bestellzahlen (`foodora_monthly`) ist leer. Statt
einer Zahl, die immer „–" zeigt, steht dort jetzt „Ø pro Monat".

## Was ich NICHT geändert habe

- Die leere Tabelle `foodora_monthly` ist weiterhin da. Falls der Mail-Import
  Brutto/Provision/Bestellanzahl künftig doch befüllt, kann man sie wieder
  anhängen — der Umsatz kommt aber weiterhin aus `foodora_location_payout`.
- Wolt- und Foodora-Daten gibt es erst ab August 2025, für September 2026 noch
  gar nicht. Das ist eine Frage an den Import, nicht an die App.
- Die alte, im Menü nicht mehr verlinkte Seite `/erfassen/schrankerl` habe ich
  stehen lassen.
