"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
      className="w-full max-w-sm rounded-xl border border-[#343A44] bg-[#22262D] p-6"
    >
      <h1 className="mb-1 text-lg font-bold text-[#E9ECEF]">
        Painel da Professora
      </h1>
      <p className="mb-6 text-sm text-[#8C94A0]">Entre com sua conta</p>

      <label className="mb-1 block text-xs font-medium text-[#8C94A0]">
        E-mail
      </label>
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-4 w-full rounded-lg border border-[#343A44] bg-[#2A2F37] px-3 py-2 text-sm text-[#E9ECEF] outline-none focus:border-[#5C9EFF]"
        placeholder="voce@escola.com"
      />

      <label className="mb-1 block text-xs font-medium text-[#8C94A0]">
        Senha
      </label>
      <input
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-4 w-full rounded-lg border border-[#343A44] bg-[#2A2F37] px-3 py-2 text-sm text-[#E9ECEF] outline-none focus:border-[#5C9EFF]"
        placeholder="••••••••"
      />

      {error && <p className="mb-4 text-sm text-[#FF6B6B]">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#5C9EFF] py-2 text-sm font-semibold text-[#0E1116] transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
