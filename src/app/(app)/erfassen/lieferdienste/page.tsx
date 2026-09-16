import { redirect } from "next/navigation";

// Wolt & Foodora werden nicht mehr manuell erfasst — der Import läuft
// automatisch aus den Auszahlungsmails. Die Auswertung mit Zeitraum und
// Vorjahresvergleich lebt jetzt unter /lieferdienste. Dieser Redirect fängt
// alte Lesezeichen/Links auf diese Seite ab.
export default function LieferdiensteRedirect() {
  redirect("/lieferdienste");
}
