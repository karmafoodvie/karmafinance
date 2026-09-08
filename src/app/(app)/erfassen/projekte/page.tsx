import { getProjectRevenue } from "@/lib/data";
import { ProjectRevenueManager } from "@/components/erfassen/ProjectRevenueManager";

export default async function ProjektePage() {
  const entries = await getProjectRevenue();

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading text-xl">Projekte &amp; Pop-ups</h1>
        <p className="text-sm text-ink/50 mt-1">
          Unregelmäßige Umsätze abseits der fixen Standorte — Kooperationen,
          Pop-ups, Events. Eigener Bereich, weil das nichts mit dem
          laufenden Lunch-Location-Geschäft zu tun hat.
        </p>
      </div>

      <ProjectRevenueManager entries={entries} />
    </div>
  );
}
