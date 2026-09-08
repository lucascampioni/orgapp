import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AlunoPagamentosView from "@/components/AlunoPagamentosView";
import type { Aluno, Pagamento } from "@/lib/types";

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

  const [{ data: alunos }, { data: pagamentos }] = await Promise.all([
    supabase.from("alunos").select("*").order("nome", { ascending: true }),
    supabase.from("pagamentos").select("*").order("vencimento", { ascending: true }),
  ]);

  return (
    <AlunoPagamentosView
      alunos={(alunos as Aluno[]) ?? []}
      pagamentos={(pagamentos as Pagamento[]) ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
