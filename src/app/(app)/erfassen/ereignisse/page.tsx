import { getBusinessEvents } from "@/lib/data";
import { LOCATIONS } from "@/lib/constants";
import { BusinessEventManager } from "@/components/erfassen/BusinessEventManager";

export default async function EreignissePage() {
  const events = await getBusinessEvents();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-xl">Ereignisse</h1>
        <p className="text-sm text-ink/50 mt-1">
          Notizen zu allem, was Einfluss auf den Umsatz gehabt haben könnte —
          Vitrine aufgebaut, Schanigarten entfernt, neues Menü, neuer Koch,
          und so weiter. Mit Tags zum Filtern.
        </p>
      </div>

      <BusinessEventManager events={events} locations={LOCATIONS} />
    </div>
  );
}
