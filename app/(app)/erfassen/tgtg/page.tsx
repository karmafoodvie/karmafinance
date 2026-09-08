import { TGTG_LOCATIONS, periodStart, monthLabel, QUICK_LINKS } from "@/lib/constants";
import { getTgtgPayoutsForPeriod } from "@/lib/data";
import { PeriodPicker } from "@/components/erfassen/PeriodPicker";
import { TgtgForm } from "@/components/erfassen/TgtgForm";
import { QuickLinks } from "@/components/ui/QuickLinks";

const links = QUICK_LINKS.filter((l) => l.key === "tgtg");

export default async function TgtgPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;
  const period = periodStart(year, month);

  const payouts = await getTgtgPayoutsForPeriod(period);
  const byLocation = Object.fromEntries(payouts.map((p) => [p.location_code, p]));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-xl">Too Good To Go</h1>
          <p className="text-sm text-ink/50 mt-1">
            Pro Standort — {monthLabel(month)} {year}
          </p>
        </div>
        <PeriodPicker year={year} month={month} />
      </div>

      <div className="mb-6">
        <QuickLinks links={links} />
      </div>

      <p className="text-sm text-ink/50 mb-4 max-w-2xl">
        Die Werte findest du im TGTG Business-Portal unter{" "}
        <span className="font-medium text-ink/70">Finanzen → Monatliche
        Abrechnungsdokumente</span> — dort rechts in der Zeile des Monats
        &bdquo;Kontoauszug&ldquo; und &bdquo;Rechnung&ldquo; exportieren.
        Brutto = Verkaufswert der geretteten Sackerl (Summe der
        Sackerl-Zeilen im Kontoauszug für diesen Standort). TGTG-Gebühr =
        Reservierungsgebühr aus der Rechnung für diesen Standort, inkl. 20 %
        USt. (Nettobetrag der Rechnungszeilen × 1,2). Netto wird automatisch
        berechnet und ist der Betrag, den TGTG tatsächlich auszahlt.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {TGTG_LOCATIONS.map((loc) => (
          <TgtgForm
            key={loc.code}
            locationCode={loc.code}
            locationName={loc.name}
            periodStart={period}
            initial={byLocation[loc.code] ?? null}
          />
        ))}
      </div>

      <p className="text-xs text-ink/35 mt-6">
        Neustiftgasse ist als Shop-Standort historisch, hatte auf TGTG aber
        bis Juni 2026 noch laufenden Umsatz — deshalb hier weiterhin
        gelistet.
      </p>
    </div>
  );
}
