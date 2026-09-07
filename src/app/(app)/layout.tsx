import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { Sidebar } from "@/components/nav/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  // Sollte durch die Middleware eigentlich nie passieren, aber sicher
  // ist sicher: ohne Profil kein Zugriff.
  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream px-6">
        <div className="max-w-sm text-center">
          <h1 className="font-heading text-xl mb-2">Noch kein Zugriff</h1>
          <p className="text-sm text-ink/60">
            Dein Account ({profile.email}) ist angelegt, hat aber aktuell keine
            Berechtigung für die Finanzübersicht. Wende dich an die
            Geschäftsführung, um deine Rechte freizuschalten.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-cream">
      <Sidebar name={profile.full_name} email={profile.email} />
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-6xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
