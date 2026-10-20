"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (iconOnly) {
    return (
      <button
        onClick={handleLogout}
        title="Sair"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted transition hover:border-danger hover:text-danger"
      >
        <LogOut size={16} strokeWidth={2} />
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted transition hover:border-brand hover:text-ink"
    >
      Sair
    </button>
  );
}
