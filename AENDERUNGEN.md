# B2B + Produktübersicht — Änderungen

## Einspielen

1. Ordner `src/` und `supabase/` aus dem ZIP über die gleichnamigen Ordner im
   Repo kopieren (alles überschreiben).
2. **`src/lib/b2bData.ts` löschen.** Die B2B-Zahlen stehen jetzt in Supabase,
   die Datei wird nicht mehr importiert. Bleibt sie liegen, stört sie nichts,
   ist aber toter Code mit veralteten Zahlen.
3. Committen und pushen — Vercel baut durch (lokal mit `npm run build` geprüft).

Die Datenbank ist **schon migriert und befüllt**, da ist nichts mehr zu tun.
Die SQL-Datei unter `supabase/migrations/` dokumentiert nur den Stand.

## Was neu ist

**`/b2b`** — eigene Seite, ersetzt die alte statische Version.
Zeitraumauswahl (von–bis, wie im Dashboard) und Vorjahresvergleich pro Kanal.
Kanäle sind in drei Gruppen geteilt:

- **Handel** — Gurkerl, Ototo, Alfies, Billa/REWE/Ja!Natürlich
- **Kühlschränke** — Schrankerl, Ritual Vend
- **Catering** — eigenes Geschäft, wird überall getrennt ausgewiesen und ist
  **nicht** im B2B-Umsatz enthalten

Unten auf der Seite: die Schrankerl-Wochenbestellungen und eine Eingabemaske
für die Monatswerte. Die Maske hat ihren eigenen Monatswähler, der die
bestehenden Werte nachlädt, unabhängig vom Auswertungszeitraum oben.

**`/produkte`** — Verkäufe pro Produkt über alle Kanäle, mit Suche,
Gruppenfilter und Zeitraumauswahl. Zeile anklicken zeigt den Monatsverlauf
aufgeschlüsselt nach Kanal.

**Dashboard** — B2B und Catering sind jetzt eigene Ströme im Monatschart und
haben eigene Kacheln. „Umsatz gesamt" enthält sie mit; die Vorjahreslinie
wurde entsprechend mit angehoben, damit nicht ein Gesamt *mit* B2B gegen ein
Vorjahr *ohne* B2B verglichen wird.

**Lieferdienste** — enthält wieder nur Wolt und Foodora. Der Schrankerl-Block
ist nach `/b2b` gewandert.

## Zwei Sachen, die man wissen muss

**Shopify liefert keine Stückzahlen je Produkt**, nur die Anzahl Bestellungen,
die ein Produkt enthalten. Zwei Gläser in einer Bestellung zählen dort als 1.
Deshalb stehen „Stück" und „Bestellungen" überall in getrennten Spalten und
werden nie addiert. Der *Umsatz* ist über alle Kanäle netto und damit
vergleichbar.

**B2B-Produktdaten fehlen noch.** Für Gurkerl, Ototo, Alfies und Billa liegen
nur Monatssummen je Kanal vor, keine Artikelzeilen. Sobald ein Odoo-Export auf
Positionsebene (sale.order.line: Produkt, Kunde, Datum, Menge, Nettobetrag) da
ist, lässt sich das als weiterer Kanal in `product_sales_monthly` ergänzen.
