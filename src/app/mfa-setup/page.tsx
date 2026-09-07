"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup, FieldError } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";

export default function MfaSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let active = true;

    async function setup() {
      const supabase = createClient();

      // Nicht abgeschlossene Versuche von vorher aufräumen, sonst lehnt
      // Supabase den neuen Enroll-Call ab.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const unverified =
        existing?.all.filter(
          (f) => f.factor_type === "totp" && f.status === "unverified",
        ) ?? [];
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Gerät ${new Date().toLocaleDateString("de-AT")}`,
      });

      if (!active) return;

      if (error || !data) {
        setError(error?.message ?? "Setup konnte nicht gestartet werden.");
        setLoading(false);
        return;
      }

      // Supabase liefert den QR-Code als data:-URI
      // ("data:image/svg+xml;utf-8,<svg>...") statt als reines SVG-Markup.
      // Für dangerouslySetInnerHTML brauchen wir nur den Teil ab dem <svg>-Tag.
      const rawQrCode = data.totp.qr_code;
      const svgStart = rawQrCode.indexOf("<svg");
      setQrCode(svgStart >= 0 ? rawQrCode.slice(svgStart) : rawQrCode);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setLoading(false);
    }

    setup();
    return () => {
      active = false;
    };
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setError(null);
    setVerifying(true);

    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    setVerifying(false);

    if (error) {
      setError(
        error.message.toLowerCase().includes("invalid")
          ? "Code stimmt nicht. Nochmal versuchen."
          : error.message,
      );
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream">
      <div className="mb-8 text-center max-w-sm">
        <h1 className="font-heading text-2xl text-ink mb-1">
          Zwei-Faktor-Login einrichten
        </h1>
        <p className="text-sm text-ink/50">
          Pflicht für alle Zugänge zur Finanzübersicht. Scanne den Code mit
          einer Authenticator-App (z. B. Google Authenticator, Authy,
          1Password).
        </p>
      </div>

      {loading && <p className="text-sm text-ink/50">Wird vorbereitet…</p>}

      {!loading && qrCode && (
        <Card className="w-full max-w-sm">
          <div
            className="mx-auto mb-4 w-48 h-48 [&_svg]:w-full [&_svg]:h-full"
            dangerouslySetInnerHTML={{ __html: qrCode }}
          />
          {secret && (
            <p className="text-center text-xs text-ink/40 mb-5 break-all">
              Code klappt nicht? Manuell eintragen:{" "}
              <span className="font-mono">{secret}</span>
            </p>
          )}
          <form onSubmit={handleVerify}>
            <FieldGroup>
              <Label htmlFor="code">6-stelliger Code aus der App</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
              />
              <FieldError>{error}</FieldError>
            </FieldGroup>
            <Button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="w-full"
            >
              {verifying ? "Prüfe…" : "Bestätigen & aktivieren"}
            </Button>
          </form>
        </Card>
      )}

      {!loading && !qrCode && (
        <Card className="w-full max-w-sm text-center">
          <p className="text-sm text-orange">{error}</p>
        </Card>
      )}
    </div>
  );
}
