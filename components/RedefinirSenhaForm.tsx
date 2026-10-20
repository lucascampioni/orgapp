"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

export default function RedefinirSenhaForm() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (senha !== confirmacao) {
      setError("As senhas não são iguais.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });

    if (error) {
      setLoading(false);
      setError("Não foi possível trocar a senha. Tente pedir um novo link.");
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
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Logo size="lg" />
          <p className="mt-2 text-sm text-muted">Escolha uma senha nova</p>
        </div>
        <ThemeToggle />
      </div>

      <label className="mb-1 block text-xs font-medium text-muted">Nova senha</label>
      <input
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        className="mb-4 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand"
        placeholder="••••••••"
      />

      <label className="mb-1 block text-xs font-medium text-muted">Confirmar senha</label>
      <input
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
        value={confirmacao}
        onChange={(e) => setConfirmacao(e.target.value)}
        className="mb-4 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand"
        placeholder="••••••••"
      />

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-strong disabled:opacity-60"
      >
        {loading ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}
