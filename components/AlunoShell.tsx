"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import type { Aluno, Convite } from "@/lib/types";

const NAV = [
  { href: "/", label: "Início", icon: "◱" },
  { href: "/tarefas", label: "Tarefas", icon: "✓" },
  { href: "/aulas", label: "Aulas", icon: "▦" },
  { href: "/vocabulario", label: "Vocabulário", icon: "✎" },
  { href: "/pagamentos", label: "Pagamentos", icon: "$" },
];

export default function AlunoShell({
  userEmail,
  alunos,
  alunoAtivoId,
  onSelecionarAluno,
  children,
}: {
  userEmail: string;
  alunos: Aluno[];
  alunoAtivoId: string;
  onSelecionarAluno: (id: string) => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [respondendo, setRespondendo] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    supabase
      .from("convites")
      .select("*")
      .eq("status", "pendente")
      .then(({ data }) => {
        if (!cancelado && data) setConvites(data as Convite[]);
      });
    return () => {
      cancelado = true;
    };
  }, [supabase]);

  async function responderConvite(convite: Convite, aceitar: boolean) {
    setRespondendo(convite.id);
    const { error } = await supabase.rpc("responder_convite", {
      p_convite_id: convite.id,
      p_aceitar: aceitar,
    });
    setRespondendo(null);
    if (error) {
      console.error("Falha ao responder convite", error);
      return;
    }
    setConvites((prev) => prev.filter((c) => c.id !== convite.id));
    if (aceitar) router.refresh();
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-full">
      {convites.length > 0 && (
        <div className="flex flex-col gap-2 border-b border-border bg-surface p-3">
          {convites.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand/40 bg-surface-2 px-3 py-2"
            >
              <span className="text-sm text-ink">
                <strong>{c.professor_nome ?? "Uma professora"}</strong> quer te vincular como aluno(a).
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => responderConvite(c, true)}
                  disabled={respondendo === c.id}
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-ink transition hover:bg-brand-strong disabled:opacity-50"
                >
                  Aceitar
                </button>
                <button
                  onClick={() => responderConvite(c, false)}
                  disabled={respondendo === c.id}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition hover:text-ink disabled:opacity-50"
                >
                  Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="md:flex">
        <aside className="border-b border-border bg-surface px-4 py-3 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r md:px-4 md:py-6">
        <div className="mb-5 hidden md:block">
          <Logo size="sm" />
        </div>
        <div className="mb-3 flex items-center justify-between gap-2 md:hidden">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto md:flex-col md:gap-1 md:overflow-visible">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition md:shrink ${
                isActive(item.href)
                  ? "bg-surface-2 text-ink"
                  : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {alunos.length > 1 && (
          <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
            <div className="mb-1 text-xs font-medium text-muted">Aluno</div>
            {alunos.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelecionarAluno(a.id)}
                className={`rounded-lg px-3 py-1.5 text-left text-[13px] transition ${
                  a.id === alunoAtivoId
                    ? "bg-surface-2 text-ink"
                    : "text-muted hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {a.nome}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 hidden border-t border-border pt-4 md:block">
          <div className="mb-2 truncate text-xs text-muted">{userEmail}</div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-7">
          <div className="mx-auto max-w-[1000px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
