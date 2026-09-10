# Warenkorb, Bestellverhalten und Häufigkeit — was die echten Kassendaten zum Membership-Konzept sagen

**Anlass:** Ergänzung zu `KarmaFoodMembershipKonzept.md`. Die Umfrage hatte nur 134-139 Antworten — hier sind die Zahlen aus den **echten Kassendaten** (Odoo POS, tagesgenau, alle 6 Standorte, 07.01.2025 bis 08.09.2026, 121.072 Bestellungen, 1.501.848,88 € Umsatz). Validiert gegen die bereits importierte Kategorie-/Produktumsatzsumme, Abweichung praktisch 0 %.

---

## 1. Der echte Warenkorb: 12,40 € — und er steigt

Durchschnittlicher Bestellwert über den ganzen Zeitraum: **12,40 € pro Bestellung**. Das passt gut zur Preisstruktur im Konzept (Gerichte 10,50-11,50 €) — im Schnitt kommt noch ein kleiner Aufschlag durch Zusatzartikel dazu.

Der Warenkorb steigt kontinuierlich:

| Zeitraum | Ø Warenkorb |
|---|---|
| H1 2025 | 12,11 € |
| H2 2025 | 12,34 € |
| H1 2026 | 12,70 € |

**+4,9 % im Jahresvergleich.** Aber: Artikel pro Bestellung bleiben stabil bei 1,44-1,50 — der Anstieg kommt von höheren Preisen/teureren Produkten, nicht davon, dass Leute mehr einpacken. Wichtig fürs Konzept: **nur 47 % der Bestellungen enthalten überhaupt einen zweiten Artikel** (Drink, Sweet, Extra). Modell A rechnet mit "10 Gerichte im Voraus" — das bildet nur den Gerichte-Preis ab, nicht das, was bei gut der Hälfte der Besuche zusätzlich an der Kassa hängen bleibt. Bei einem Prepaid-Block würde dieser Zusatzumsatz beim Einlösen vermutlich trotzdem weiter separat bezahlt (ist ja nicht im Blockpreis drin) — aber es lohnt sich, das beim Rabattsatz mitzudenken, weil der Gast den Block ja gerade als Ersatz fürs "volle Bestellen" wahrnehmen könnte.

## 2. Warenkorb nach Standort — relevant für einen Modell-B-Testlauf

| Standort | Ø Warenkorb | Bestellungen |
|---|---|---|
| 3400 Kitchen (Inkustraße) | 14,34 € | 18.332 |
| 1070 Neustiftgasse (eingestellt) | 12,71 € | 10.588 |
| 1020 Ausstellungsstraße | 12,50 € | 17.663 |
| 3400 Stadtplatz | 12,25 € | 20.843 |
| 1010 Laurenzerberg | 11,81 € | 30.380 |
| 1010 Börse | 11,59 € | 23.266 |

Das Konzept schlägt vor, Modell B (Abo) zuerst an einem Standort zu testen. Laurenzerberg ist mit Abstand der größte Standort (30.380 Bestellungen) — dort hätte ein Test die meiste statistische Aussagekraft in kurzer Zeit. Kitchen sticht mit dem höchsten Warenkorb heraus, ist aber ein Produktionsstandort mit angeschlossenem Verkauf, also vermutlich kein typisches Vergleichsbeispiel für die anderen Lunch-Locations.

## 3. Bestellvolumen sinkt — das stützt die Grundidee des Konzepts

Vergleich H1 2025 zu H1 2026:

| Kennzahl | H1 2025 | H1 2026 | Veränderung |
|---|---|---|---|
| Bestellungen | 38.778 | 34.606 | -10,8 % |
| Ø Warenkorb | 12,11 € | 12,70 € | +4,9 % |
| Umsatz | 469.544 € | 439.574 € | -6,4 % |

Die Bestellzahl geht zurück (teils wegen Neustiftgasse-Wegfall Mitte 2025, aber nicht nur), der höhere Warenkorb federt das ab. Das bestätigt genau das Problem, das das Konzept lösen will: **planbarer, wiederkehrender Umsatz statt tagesabhängiger Laufkundschaft.** Weniger Bestellungen bei stabiler/steigender Zahlungsbereitschaft ist ein Argument dafür, bestehende Gäste stärker zu binden (Modell B), statt nur auf neue Laufkundschaft zu hoffen.

Werktagsmuster: praktisch nur Mo-Fr, Freitag deutlich schwächer (Homeoffice-Effekt vermutlich), Wochenende bis auf den ehemaligen Standort Neustiftgasse irrelevant.

## 4. Lunch Combo: 9,51 % — eine reale Zahl, nicht geschätzt

11.520 verkaufte Lunch Combos auf 121.072 Bestellungen = **9,51 % aller Bestellungen sind eine Lunch Combo.** Falls ein Membership einen Combo-Bonus als Zusatzanreiz bekommt (im Konzept unter Modell B als Idee genannt), ist das die Basislinie, gegen die man eine Steigerung später messen kann.

## 5. Was die Kassendaten NICHT liefern können: individuelle Besuchshäufigkeit

Odoo-Kassendaten haben keine Kunden-ID — jede Bestellung steht für sich, wir wissen nicht, ob dieselbe Person zwei Bestellungen aufgegeben hat. Die "30 % kommen mind. 1×/Woche"-Zahl aus der Umfrage (n=137) bleibt also die einzige Quelle für die Break-even-Rechnung in Modell B — und die ist mit n=137 statistisch dünn.

**Das ist genau die Lücke, die euer Treueprogramm schließen könnte:** Wenn ihr aus Odoo den Verwendungsverlauf des Stempelkarten-Programms ("Karte voll", `loyalty.history`) exportiert (siehe separate Nachricht zum Treueprogramm-Export), bekommt ihr über die Zeit echte, individuelle Wiederkehr-Daten — nicht nur einmalig aus einer Umfrage. Das wäre die verlässlichste Grundlage für die Modell-B-Kalkulation, die es aktuell aus keiner eurer Datenquellen gibt.

---

## Kurz zusammengefasst für die Weiterrechnung

- Realer Ø Warenkorb: **12,40 €**, steigt (+4,9 % p.a.), kommt von Preisen, nicht von mehr Artikeln
- 47 % der Bestellungen haben einen Zusatzartikel — Modell A sollte das beim Rabattsatz mitdenken
- Laurenzerberg = größter Standort, beste Basis für einen Modell-B-Test; Kitchen hat den höchsten Warenkorb, ist aber kein typischer Vergleichsstandort
- Bestellvolumen sinkt (-10,8 % YoY), das stützt die Grundidee des Konzepts
- Lunch-Combo-Quote 9,51 % ist eine reale Basislinie
- Individuelle Besuchshäufigkeit bleibt Umfrage-Territorium, bis es echte Treueprogramm-Bewegungsdaten aus Odoo gibt
