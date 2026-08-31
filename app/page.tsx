import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfessorShell from "@/components/ProfessorShell";
import DashboardHome from "@/components/DashboardHome";
import AlunoPortal from "@/components/AlunoPortal";
import type {
  Aluno,
  AlunoProfessor,
  Aula,
  Pagamento,
  TarefaAula,
  Vocabulario,
} from "@/lib/types";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = (user.user_metadata as { role?: string } | null)?.role;

  if (role === "aluno") {
    // Idempotente: linka qualquer cadastro de aluno (de qualquer professora)
    // que tenha o mesmo e-mail dessa conta e ainda não esteja vinculado.
    await supabase.rpc("vincular_conta_aluno");

    const [
      { data: alunos },
      { data: aulas },
      { data: tarefasAula },
      { data: vocabulario },
      { data: pagamentos },
    ] = await Promise.all([
      supabase.from("alunos").select("*").order("nome", { ascending: true }),
      supabase.from("aulas").select("*").order("data", { ascending: true }),
      supabase.from("tarefas_aula").select("*").order("criado_em", { ascending: true }),
      supabase.from("vocabulario").select("*").order("criado_em", { ascending: false }),
      supabase.from("pagamentos").select("*").order("vencimento", { ascending: true }),
    ]);

    return (
      <AlunoPortal
        alunos={(alunos as Aluno[]) ?? []}
        aulas={(aulas as Aula[]) ?? []}
        tarefasAula={(tarefasAula as TarefaAula[]) ?? []}
        vocabulario={(vocabulario as Vocabulario[]) ?? []}
        pagamentos={(pagamentos as Pagamento[]) ?? []}
        userEmail={user.email ?? ""}
      />
    );
  }

  const [{ data: alunos }, { data: alunoProfessor }, { data: aulas }, { data: tarefasAula }, { data: vocabulario }] =
    await Promise.all([
      supabase.from("alunos").select("*"),
      supabase.from("aluno_professor").select("*"),
      supabase.from("aulas").select("*"),
      supabase.from("tarefas_aula").select("*"),
      supabase.from("vocabulario").select("*"),
    ]);

  return (
    <ProfessorShell userEmail={user.email ?? ""}>
      <DashboardHome
        userEmail={user.email ?? ""}
        alunos={(alunos as Aluno[]) ?? []}
        alunoProfessor={(alunoProfessor as AlunoProfessor[]) ?? []}
        aulas={(aulas as Aula[]) ?? []}
        tarefasAula={(tarefasAula as TarefaAula[]) ?? []}
        vocabulario={(vocabulario as Vocabulario[]) ?? []}
      />
    </ProfessorShell>
  );
}
