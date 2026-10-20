import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AlunoPagamentosView from "@/components/AlunoPagamentosView";
import ProfessorShell from "@/components/ProfessorShell";
import PagamentosProfessorView from "@/components/PagamentosProfessorView";
import type { Aluno, AlunoProfessor, Pagamento } from "@/lib/types";

export default async function PagamentosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = (user.user_metadata as { role?: string } | null)?.role;

  if (role === "aluno") {
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

  const [{ data: pagamentos }, { data: alunos }, { data: professor }] = await Promise.all([
    supabase.from("pagamentos").select("*").order("vencimento", { ascending: true }),
    supabase.from("alunos").select("*"),
    supabase.from("professores").select("nome").eq("id", user.id).maybeSingle(),
  ]);

  return (
    <ProfessorShell userEmail={user.email ?? ""} professorNome={professor?.nome}>
      <PagamentosProfessorView
        pagamentos={(pagamentos as Pagamento[]) ?? []}
        alunos={(alunos as Aluno[]) ?? []}
      />
    </ProfessorShell>
  );
}
