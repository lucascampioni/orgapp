"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import PasswordField from "@/components/PasswordField";

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

      <PasswordField label="Nova senha" value={senha} onChange={setSenha} autoComplete="new-password" />
      <PasswordField
        label="Confirmar senha"
        value={confirmacao}
        onChange={setConfirmacao}
        autoComplete="new-password"
        bloquearColar
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
