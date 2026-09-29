# Auftrag an mich selbst

Gurl will in der Finanzübersicht-App (Next.js + Supabase + Vercel) ein automatisches
Signal, wenn neue Kassendaten eingespielt wurden — aktuell merkt sie das nur, wenn sie
selbst nachschaut. Ziel: sobald neue Zeilen in `pos_order_daily` auftauchen (egal ob
künftig über ein App-Upload-Feature oder wie bisher manuell über Claude/Supabase
eingepflegt), soll beim nächsten Öffnen der App einmalig ein Pop-up erscheinen mit:

1. einem kompakten Trendchart (Wochenumsatz der letzten ~8 Wochen, aktuelle + Vorwoche
   hervorgehoben),
2. einer Ein-Satz-Zusammenfassung ("Diese Woche bisher X €, Vorwoche Y € — +/-Z%"),
3. einem Hinweis, wenn die aktuelle Woche noch unvollständig ist (weniger als 5
   Handelstage), damit die Zahl nicht als fertiger Wochenwert missverstanden wird.

Randbedingungen aus dem, was ich über die App weiß:
- Standorte: 5 aktive (Neustiftgasse seit Juli 2026 geschlossen, aus der Aggregation
  raus), Mo–Fr-Betrieb, keine Samstage — "Woche" ist also ISO-Woche Mo–Fr.
- Ich habe keinen direkten Repo-/Push-Zugriff (Gurl lädt ZIPs selbst auf GitHub hoch
  und deployed über Vercel) und kenne die genaue Ordnerstruktur/Komponenten-Bibliothek
  der App nicht aus dieser Session heraus.
- CI: Neongelb #D4FF3F, Orange #E94E1B, Dark Ink #1B1B14, Cream #FAF6EA, Headings
  Boldonse, Fließtext Geist.

Deshalb baue ich das jetzt als eigenständiges, so gut wie dependency-freies
React/TypeScript-Paket (eigene SVG-Chart-Komponente statt einer Chart-Lib, die
vielleicht nicht installiert ist), mit klar kommentierten Stellen, wo der bestehende
Supabase-Client und die App-Farben/Fonts eingesetzt werden müssen. Liefere es als
Dateien + kurze Integrationsanleitung, statt es "live" zu bauen, weil ich den echten
Code der App nicht sehe. Wenn eine künftige Session (oder ich mit Repo-Zugriff)
draufschaut, sind die Anpassungsstellen mit `// TODO(integration)` markiert.
