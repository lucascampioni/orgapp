"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/LogoutButton";

const NAV = [
  { href: "/", label: "Dashboard", icon: "◱" },
  { href: "/alunos", label: "Alunos", icon: "☺" },
  { href: "/tarefas", label: "Tarefas", icon: "✓" },
];

export default function ProfessorShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-full md:flex">
      <aside className="border-b border-border bg-surface px-4 py-3 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r md:px-4 md:py-6">
        <div className="mb-5 hidden md:block">
          <Logo size="sm" />
        </div>
        <div className="mb-3 flex items-center justify-between md:hidden">
          <Logo size="sm" />
          <LogoutButton />
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

        <div className="mt-6 hidden border-t border-border pt-4 md:block">
          <div className="mb-2 truncate text-xs text-muted">{userEmail}</div>
          <LogoutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-6 py-7">
        <div className="mx-auto max-w-[1000px]">{children}</div>
      </main>
    </div>
  );
}
