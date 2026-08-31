import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfessorShell from "@/components/ProfessorShell";
import TarefasLista from "@/components/TarefasLista";
import type { Aluno, Aula, TarefaAula } from "@/lib/types";

export default async function TarefasPage() {
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

  const [{ data: tarefas }, { data: aulas }, { data: alunos }] = await Promise.all([
    supabase.from("tarefas_aula").select("*").order("criado_em", { ascending: false }),
    supabase.from("aulas").select("*"),
    supabase.from("alunos").select("*"),
  ]);

  return (
    <ProfessorShell userEmail={user.email ?? ""}>
      <TarefasLista
        initialTarefas={(tarefas as TarefaAula[]) ?? []}
        aulas={(aulas as Aula[]) ?? []}
        alunos={(alunos as Aluno[]) ?? []}
      />
    </ProfessorShell>
  );
}
