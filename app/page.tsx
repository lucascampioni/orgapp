import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/Dashboard";
import type {
  Aluno,
  AlunoProfessor,
  Aula,
  Material,
  Pagamento,
  TarefaAula,
  Turma,
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

  const [
    { data: turmas },
    { data: alunos },
    { data: alunoProfessor },
    { data: aulas },
    { data: materiais },
    { data: tarefasAula },
    { data: vocabulario },
    { data: pagamentos },
  ] = await Promise.all([
    supabase.from("turmas").select("*").order("nome", { ascending: true }),
    supabase.from("alunos").select("*").order("nome", { ascending: true }),
    supabase.from("aluno_professor").select("*"),
    supabase.from("aulas").select("*").order("data", { ascending: true }),
    supabase
      .from("materiais")
      .select("*")
      .order("criado_em", { ascending: false }),
    supabase
      .from("tarefas_aula")
      .select("*")
      .order("criado_em", { ascending: true }),
    supabase
      .from("vocabulario")
      .select("*")
      .order("criado_em", { ascending: false }),
    supabase
      .from("pagamentos")
      .select("*")
      .order("vencimento", { ascending: true }),
  ]);

  return (
    <Dashboard
      initialTurmas={(turmas as Turma[]) ?? []}
      initialAlunos={(alunos as Aluno[]) ?? []}
      initialAlunoProfessor={(alunoProfessor as AlunoProfessor[]) ?? []}
      initialAulas={(aulas as Aula[]) ?? []}
      initialMateriais={(materiais as Material[]) ?? []}
      initialTarefasAula={(tarefasAula as TarefaAula[]) ?? []}
      initialVocabulario={(vocabulario as Vocabulario[]) ?? []}
      initialPagamentos={(pagamentos as Pagamento[]) ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
