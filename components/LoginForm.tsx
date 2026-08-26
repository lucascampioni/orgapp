"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setError("E-mail ou senha inválidos.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-2xl shadow-black/40"
    >
      <div className="mb-6">
        <Logo size="lg" />
        <p className="mt-2 text-sm text-muted">
          Alunos, aulas e vocabulário num só lugar.
        </p>
      </div>

      <label className="mb-1 block text-xs font-medium text-muted">E-mail</label>
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-4 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand"
        placeholder="voce@escola.com"
      />

      <label className="mb-1 block text-xs font-medium text-muted">Senha</label>
      <input
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-4 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand"
        placeholder="••••••••"
      />

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-strong disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
