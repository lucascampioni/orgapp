"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-full border border-[#343A44] bg-[#22262D] px-3 py-1.5 text-xs text-[#8C94A0] transition hover:border-[#5C9EFF] hover:text-[#E9ECEF]"
    >
      Sair
    </button>
  );
}
