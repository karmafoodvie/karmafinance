import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth"];
const MFA_PATHS = ["/mfa-setup", "/mfa-challenge"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  const isMfaPath = MFA_PATHS.some((p) => path.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Zwei-Faktor-Pflicht: sensible Finanzdaten, daher reicht Passwort
  // allein nicht. Jeder eingeloggte User braucht einen verifizierten
  // TOTP-Faktor (aal2) — sonst geht's nur auf /mfa-setup oder
  // /mfa-challenge weiter, nirgendwo sonst hin.
  if (user && !isPublic) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal) {
      const hasVerifiedFactor = aal.nextLevel === "aal2";
      const sessionIsElevated = aal.currentLevel === "aal2";

      if (!hasVerifiedFactor && !isMfaPath) {
        const url = request.nextUrl.clone();
        url.pathname = "/mfa-setup";
        url.search = "";
        return NextResponse.redirect(url);
      }

      if (hasVerifiedFactor && !sessionIsElevated && !isMfaPath) {
        const url = request.nextUrl.clone();
        url.pathname = "/mfa-challenge";
        url.search = "";
        return NextResponse.redirect(url);
      }

      if (isMfaPath && hasVerifiedFactor && sessionIsElevated) {
        // Schon voll verifiziert -> nicht mehr auf den MFA-Seiten festhängen.
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
