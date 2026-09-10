import { Suspense } from "react";
import { ShopsNav } from "@/components/shops/ShopsNav";

// Gemeinsamer Rahmen für alle Shops-Reiter: Titel, Unter-Navigation und die
// Filter (Zeitraum + Shop-Auswahl), die für jeden Reiter gelten.
export default function ShopsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Suspense fallback={<div className="h-32" />}>
        <ShopsNav />
      </Suspense>
      {children}
    </div>
  );
}
