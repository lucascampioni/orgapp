import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CadastroForm from "@/components/CadastroForm";

export default async function CadastroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full opacity-20 blur-[120px]"
        style={{ background: "var(--color-brand)" }}
      />
      <CadastroForm />
    </main>
  );
}
