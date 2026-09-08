import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfessorShell from "@/components/ProfessorShell";
import CalendarioView from "@/components/CalendarioView";
import type { Aluno, Aula, ErroAula, TarefaAula, Vocabulario } from "@/lib/types";

export default async function CalendarioPage() {
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

  const [
    { data: alunos },
    { data: aulas },
    { data: tarefasAula },
    { data: vocabulario },
    { data: erros },
    { data: googleConexao },
    { data: googleVinculos },
  ] = await Promise.all([
    supabase.from("alunos").select("*").order("nome", { ascending: true }),
    supabase.from("aulas").select("*"),
    supabase.from("tarefas_aula").select("*"),
    supabase.from("vocabulario").select("*"),
    supabase.from("erros_aula").select("*"),
    supabase.from("google_conexoes").select("google_email").maybeSingle(),
    supabase.from("google_vinculos").select("*"),
  ]);

  return (
    <ProfessorShell userEmail={user.email ?? ""}>
      <CalendarioView
        initialAulas={(aulas as Aula[]) ?? []}
        alunos={(alunos as Aluno[]) ?? []}
        initialTarefasAula={(tarefasAula as TarefaAula[]) ?? []}
        initialVocabulario={(vocabulario as Vocabulario[]) ?? []}
        initialErros={(erros as ErroAula[]) ?? []}
        googleConectado={Boolean(googleConexao)}
        googleEmail={googleConexao?.google_email ?? null}
        googleVinculos={googleVinculos ?? []}
      />
    </ProfessorShell>
  );
}
