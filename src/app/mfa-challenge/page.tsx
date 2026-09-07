"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup, FieldError } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";

export default function MfaChallengePage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (!active) return;

      const factor = data?.totp[0];
      if (error || !factor) {
        setError("Kein eingerichteter Zwei-Faktor-Login gefunden.");
        setLoading(false);
        return;
      }

      setFactorId(factor.id);
      setLoading(false);
    }

    load();
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

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream">
      <div className="mb-8 text-center max-w-sm">
        <h1 className="font-heading text-2xl text-ink mb-1">
          Code bestätigen
        </h1>
        <p className="text-sm text-ink/50">
          Gib den 6-stelligen Code aus deiner Authenticator-App ein.
        </p>
      </div>

      {loading && <p className="text-sm text-ink/50">Lädt…</p>}

      {!loading && factorId && (
        <Card className="w-full max-w-sm">
          <form onSubmit={handleVerify}>
            <FieldGroup>
              <Label htmlFor="code">Code</Label>
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
              {verifying ? "Prüfe…" : "Bestätigen"}
            </Button>
          </form>
        </Card>
      )}

      {!loading && !factorId && (
        <Card className="w-full max-w-sm text-center">
          <p className="text-sm text-orange mb-4">{error}</p>
        </Card>
      )}

      <button
        onClick={handleSignOut}
        className="mt-6 text-xs font-medium text-ink/40 hover:text-orange transition-colors cursor-pointer"
      >
        Abmelden
      </button>
    </div>
  );
}
