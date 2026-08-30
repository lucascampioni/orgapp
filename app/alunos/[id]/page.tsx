import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AlunoPerfil from "@/components/AlunoPerfil";
import type {
  Aluno,
  AlunoProfessor,
  Aula,
  Pagamento,
  TarefaAula,
  Turma,
  Vocabulario,
} from "@/lib/types";

export default async function AlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const [{ data: aluno }, { data: vinculo }, { data: turmas }, { data: aulas }] =
    await Promise.all([
      supabase.from("alunos").select("*").eq("id", id).single(),
      supabase.from("aluno_professor").select("*").eq("aluno_id", id).single(),
      supabase.from("turmas").select("*").order("nome", { ascending: true }),
      supabase
        .from("aulas")
        .select("*")
        .eq("aluno_id", id)
        .order("data", { ascending: true }),
    ]);

  if (!aluno) {
    redirect("/");
  }

  const aulaIds = (aulas ?? []).map((a) => a.id);

  const [{ data: tarefasAula }, { data: vocabulario }, { data: pagamentos }] =
    await Promise.all([
      aulaIds.length > 0
        ? supabase
            .from("tarefas_aula")
            .select("*")
            .in("aula_id", aulaIds)
            .order("criado_em", { ascending: true })
        : Promise.resolve({ data: [] as TarefaAula[] }),
      supabase
        .from("vocabulario")
        .select("*")
        .eq("aluno_id", id)
        .order("criado_em", { ascending: false }),
      supabase
        .from("pagamentos")
        .select("*")
        .eq("aluno_id", id)
        .order("vencimento", { ascending: true }),
    ]);

  return (
    <AlunoPerfil
      aluno={aluno as Aluno}
      vinculo={(vinculo as AlunoProfessor) ?? null}
      turmas={(turmas as Turma[]) ?? []}
      initialAulas={(aulas as Aula[]) ?? []}
      initialTarefasAula={(tarefasAula as TarefaAula[]) ?? []}
      initialVocabulario={(vocabulario as Vocabulario[]) ?? []}
      initialPagamentos={(pagamentos as Pagamento[]) ?? []}
    />
  );
}
