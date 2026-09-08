"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { inputClass, labelClass } from "@/components/ui";
import { SEXOS } from "@/lib/sexo";
import type { Sexo } from "@/lib/types";

type Escolha = "escolha" | "professora" | "aluno";

const cardClass =
  "w-full rounded-xl border border-border bg-surface-2 p-4 text-left transition hover:border-brand";

export default function CadastroForm() {
  const [tipo, setTipo] = useState<Escolha>("escolha");

  return (
    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-2xl shadow-black/40">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Logo size="lg" />
          <p className="mt-2 text-sm text-muted">Criar conta</p>
        </div>
        <ThemeToggle />
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

      {tipo === "professora" && <ProfessoraSignupForm onVoltar={() => setTipo("escolha")} />}

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
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState<Sexo | "">("");
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
      options: {
        data: {
          role: "aluno",
          nome,
          data_nascimento: dataNascimento || null,
          sexo: sexo || null,
        },
      },
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

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Data de nascimento</label>
          <input
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Sexo</label>
          <select
            required
            value={sexo}
            onChange={(e) => setSexo(e.target.value as Sexo | "")}
            className={inputClass}
          >
            <option value="" disabled hidden>
              Selecione...
            </option>
            {SEXOS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

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

const MSG_NAO_LIBERADA =
  "Só quem foi liberado pelo administrador pode criar conta de professora. Entre em contato com a administração do Lumina pra pedir acesso.";

function ProfessoraSignupForm({ onVoltar }: { onVoltar: () => void }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [sexo, setSexo] = useState<Sexo | "">("");
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
      options: {
        data: {
          nome,
          data_nascimento: dataNascimento || null,
          sexo: sexo || null,
        },
      },
    });

    if (error) {
      setLoading(false);
      // O bloqueio de conta não liberada acontece num trigger do banco (ver
      // schema.sql); não dá pra garantir com 100% de certeza que o
      // Supabase repassa essa mensagem específica sem alterar (às vezes
      // erros de trigger em auth.users viram um "Database error..."
      // genérico) - por isso o fallback pega qualquer coisa que pareça
      // vir desse bloqueio, mas se não bater com nada, mostra o erro cru.
      const msg = error.message.toLowerCase();
      if (msg.includes("professora_nao_liberada") || msg.includes("database error saving new user")) {
        setError(MSG_NAO_LIBERADA);
      } else {
        setError(error.message);
      }
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
      <label className={labelClass}>Nome</label>
      <input
        required
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className={`mb-4 ${inputClass}`}
        placeholder="Seu nome"
      />

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Data de nascimento</label>
          <input
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Sexo</label>
          <select
            required
            value={sexo}
            onChange={(e) => setSexo(e.target.value as Sexo | "")}
            className={inputClass}
          >
            <option value="" disabled hidden>
              Selecione...
            </option>
            {SEXOS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className={labelClass}>E-mail</label>
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`mb-4 ${inputClass}`}
        placeholder="voce@email.com"
      />

      <label className={labelClass}>Senha</label>
      <input
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={`mb-4 ${inputClass}`}
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
