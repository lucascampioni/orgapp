"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

export default function EsqueciSenhaForm({ erroInicial }: { erroInicial?: string | null }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(erroInicial ?? null);
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/confirm?next=/redefinir-senha`,
    });

    setLoading(false);
    if (error) {
      setError("Não foi possível enviar o link agora. Tente de novo em instantes.");
      return;
    }
    setEnviado(true);
  }

  return (
    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-2xl shadow-black/40">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Logo size="lg" />
          <p className="mt-2 text-sm text-muted">Redefinir senha</p>
        </div>
        <ThemeToggle />
      </div>

      {enviado ? (
        <p className="text-sm text-ink">
          Se esse e-mail tiver uma conta no Lumina, você vai receber um link pra redefinir a senha
          em instantes. Pode fechar essa página.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
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

          {error && <p className="mb-4 text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-strong disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar link de redefinição"}
          </button>
        </form>
      )}

      <div className="mt-4 text-center text-xs text-muted">
        <Link href="/login" className="text-brand hover:underline">
          Voltar pro login
        </Link>
      </div>
    </div>
  );
}
