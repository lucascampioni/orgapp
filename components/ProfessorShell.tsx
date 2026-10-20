"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CalendarDays, CheckSquare, Home, Menu, User, Users, X } from "lucide-react";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import { Avatar } from "@/components/ui";

const NAV = [
  { href: "/", label: "Início", icon: Home },
  { href: "/alunos", label: "Alunos", icon: Users },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { href: "/perfil", label: "Perfil", icon: User },
];

export default function ProfessorShell({
  userEmail,
  professorNome,
  children,
}: {
  userEmail: string;
  professorNome?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerAberto, setDrawerAberto] = useState(false);

  // Fecha o drawer sozinho ao navegar - sem isso, trocar de página com o
  // menu mobile aberto deixava ele aberto por cima da página nova. Ajustado
  // durante a renderização (e não em useEffect) para evitar o re-render em
  // cascata que setState dentro de efeito causaria.
  const [pathnameAnterior, setPathnameAnterior] = useState(pathname);
  if (pathname !== pathnameAnterior) {
    setPathnameAnterior(pathname);
    setDrawerAberto(false);
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const nomeExibicao = professorNome?.trim() || userEmail.split("@")[0];

  return (
    <div className="min-h-full md:flex">
      {/* Topo mobile: só logo + hambúrguer - o resto (nav, usuário) mora no drawer. */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 md:hidden">
        <button
          onClick={() => setDrawerAberto(true)}
          title="Abrir menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition hover:text-ink"
        >
          <Menu size={20} strokeWidth={2} />
        </button>
        <Logo size="sm" />
      </div>

      {/* Drawer mobile */}
      {drawerAberto && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            onClick={() => setDrawerAberto(false)}
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-surface p-4">
            <div className="mb-5 flex items-center justify-between">
              <Logo size="sm" />
              <button
                onClick={() => setDrawerAberto(false)}
                title="Fechar menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-ink"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <SidebarNav isActive={isActive} />
            <div className="flex-1" />
            <SidebarRodape nomeExibicao={nomeExibicao} userEmail={userEmail} />
          </aside>
        </div>
      )}

      {/* Sidebar fixa (desktop) */}
      <aside className="hidden border-r border-border bg-surface px-4 py-6 md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col">
        <div className="mb-1 px-1">
          <Logo size="sm" />
          <p className="mt-1 text-xs text-muted">Gestão de aulas</p>
        </div>

        <nav className="mt-6 flex flex-1 flex-col gap-1">
          <SidebarNav isActive={isActive} />
        </nav>

        <SidebarRodape nomeExibicao={nomeExibicao} userEmail={userEmail} />
      </aside>

      <main className="min-w-0 flex-1 bg-bg px-6 py-7 md:px-8">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}

function SidebarNav({ isActive }: { isActive: (href: string) => boolean }) {
  return (
    <>
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-brand" />
            )}
            <Icon size={19} strokeWidth={2} className="shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

function SidebarRodape({ nomeExibicao, userEmail }: { nomeExibicao: string; userEmail: string }) {
  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-3 flex items-center gap-2.5 rounded-lg px-1 py-1">
        <Avatar nome={nomeExibicao} size="md" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-ink">{nomeExibicao}</div>
          <div className="truncate text-xs text-muted">{userEmail}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-1">
        <ThemeToggle />
        <LogoutButton iconOnly />
      </div>
    </div>
  );
}
