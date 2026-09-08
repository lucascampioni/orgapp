import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AlunoPagamentosView from "@/components/AlunoPagamentosView";
import type { AlunoProfessor, Pagamento } from "@/lib/types";

export default async function PagamentosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = (user.user_metadata as { role?: string } | null)?.role;
  if (role !== "aluno") {
    redirect("/");
  }

  const [{ data: vinculos }, { data: pagamentos }] = await Promise.all([
    supabase.from("aluno_professor").select("*"),
    supabase.from("pagamentos").select("*").order("vencimento", { ascending: true }),
  ]);

  return (
    <AlunoPagamentosView
      vinculos={(vinculos as AlunoProfessor[]) ?? []}
      pagamentos={(pagamentos as Pagamento[]) ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
