import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

// Lädt den eingeloggten User + sein Profil (inkl. Rolle) serverseitig.
// Gibt null zurück, wenn niemand eingeloggt ist — die Middleware fängt
// diesen Fall zwar schon über Redirects ab, aber Seiten prüfen hier
// nochmal explizit, bevor sie Finanzdaten laden.
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (profile as Profile) ?? null;
}
