"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

type Escolha = "escolha" | "professora" | "aluno";

const cardClass =
  "w-full rounded-xl border border-border bg-surface-2 p-4 text-left transition hover:border-brand";

export default function CadastroForm() {
  const [tipo, setTipo] = useState<Escolha>("escolha");

  return (
    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-2xl shadow-black/40">
      <div className="mb-6">
        <Logo size="lg" />
        <p className="mt-2 text-sm text-muted">Criar conta</p>
      </div>

      {tipo === "escolha" && (
        <div className="flex flex-col gap-3">
          <button onClick={() => setTipo("aluno")} className={cardClass}>
            <div className="text-sm font-semibold text-ink">Sou aluno(a)</div>
            <div className="mt-0.5 text-xs text-muted">
              Acompanhe suas aulas, tarefas, vocabulário e pagamentos.
            </div>
          </button>
          <button onClick={() => setTipo("professora")} className={cardClass}>
            <div className="text-sm font-semibold text-ink">Sou professor(a)</div>
            <div className="mt-0.5 text-xs text-muted">
              Gerencie seus alunos, aulas e materiais.
            </div>
          </button>
        </div>
      )}

      {tipo === "professora" && (
        <div>
          <p className="mb-4 text-sm text-muted">
            Contas de professora ainda são criadas manualmente. Entre em contato com a
            administração do Lumina pra pedir a sua.
          </p>
          <button onClick={() => setTipo("escolha")} className="text-sm text-brand hover:underline">
            ← Voltar
          </button>
        </div>
      )}

      {tipo === "aluno" && <AlunoSignupForm onVoltar={() => setTipo("escolha")} />}

      <div className="mt-6 border-t border-border pt-4 text-center text-xs text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="text-brand hover:underline">
          Entrar
        </Link>
      </div>
    </div>
  );
}

function AlunoSignupForm({ onVoltar }: { onVoltar: () => void }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: "aluno", nome } },
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    if (!data.session) {
      setLoading(false);
      setAguardandoConfirmacao(true);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  if (aguardandoConfirmacao) {
    return (
      <p className="text-sm text-muted">
        Confira seu e-mail pra confirmar a conta antes de entrar.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="mb-1 block text-xs font-medium text-muted">Nome</label>
      <input
        required
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="mb-4 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand"
        placeholder="Seu nome"
      />

      <label className="mb-1 block text-xs font-medium text-muted">E-mail</label>
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-4 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand"
        placeholder="voce@email.com"
      />
      <p className="-mt-3 mb-4 text-xs text-faint">
        Use o mesmo e-mail que sua professora cadastrou pra já ver suas aulas.
      </p>

      <label className="mb-1 block text-xs font-medium text-muted">Senha</label>
      <input
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
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
        {loading ? "Criando conta..." : "Criar conta"}
      </button>

      <button
        type="button"
        onClick={onVoltar}
        className="mt-3 w-full text-center text-sm text-muted hover:text-ink"
      >
        ← Voltar
      </button>
    </form>
  );
}
