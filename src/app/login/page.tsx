"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup, FieldError } from "@/components/ui/Field";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "E-Mail oder Passwort stimmt nicht."
          : error.message,
      );
      return;
    }

    const redirect = searchParams.get("redirect") || "/dashboard";
    router.replace(redirect);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <FieldGroup>
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@karmafood.at"
        />
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="password">Passwort</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <FieldError>{error}</FieldError>
      </FieldGroup>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Melde an…" : "Anmelden"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-cream">
      <div className="mb-10 text-center">
        <h1 className="font-heading text-2xl text-ink mb-1">Karma Food</h1>
        <p className="text-sm text-ink/50">Finanzübersicht — nur für Geschäftsführung</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-8 text-xs text-ink/35 text-center max-w-sm">
        Zugang nur auf Einladung. Falls du Zugang brauchst oder dein Passwort
        vergessen hast, wende dich an Gurl.
      </p>
    </div>
  );
}
