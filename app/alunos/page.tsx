import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfessorShell from "@/components/ProfessorShell";
import AlunosLista from "@/components/AlunosLista";
import type { Aluno, AlunoProfessor, Aula, TarefaAula, Turma } from "@/lib/types";

export default async function AlunosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = (user.user_metadata as { role?: string } | null)?.role;
  if (role === "aluno") {
    redirect("/");
  }

  const [{ data: turmas }, { data: alunos }, { data: alunoProfessor }, { data: aulas }, { data: tarefasAula }] =
    await Promise.all([
      supabase.from("turmas").select("*").order("nome", { ascending: true }),
      supabase.from("alunos").select("*").order("nome", { ascending: true }),
      supabase.from("aluno_professor").select("*"),
      supabase.from("aulas").select("*").order("data", { ascending: true }),
      supabase
        .from("tarefas_aula")
        .select("*")
        .order("criado_em", { ascending: true }),
    ]);

  return (
    <ProfessorShell userEmail={user.email ?? ""}>
      <AlunosLista
        initialTurmas={(turmas as Turma[]) ?? []}
        initialAlunos={(alunos as Aluno[]) ?? []}
        initialAlunoProfessor={(alunoProfessor as AlunoProfessor[]) ?? []}
        initialAulas={(aulas as Aula[]) ?? []}
        initialTarefasAula={(tarefasAula as TarefaAula[]) ?? []}
      />
    </ProfessorShell>
  );
}
