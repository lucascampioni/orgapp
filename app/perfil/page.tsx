import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfessorPerfilView from "@/components/ProfessorPerfilView";
import AlunoMeuPerfilView from "@/components/AlunoMeuPerfilView";
import type { Aluno, AlunoProfessor, Professor } from "@/lib/types";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = (user.user_metadata as { role?: string } | null)?.role;

  if (role === "aluno") {
    const { data: aluno } = await supabase
      .from("alunos")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: vinculos } = aluno
      ? await supabase.from("aluno_professor").select("*").eq("aluno_id", aluno.id)
      : { data: [] };

    const metadata = user.user_metadata as
      | { nome?: string; data_nascimento?: string; sexo?: Aluno["sexo"] }
      | null;

    // Conta antiga (criada antes do trigger que cria essa linha existir) -
    // monta um perfil vazio em memória (com o que foi preenchido no
    // cadastro, se ainda estiver nos metadados da conta); o primeiro
    // "Salvar" já cria a linha.
    const alunoFallback: Aluno = (aluno as Aluno | null) ?? {
      id: "",
      nome: metadata?.nome || user.email?.split("@")[0] || "",
      contato: null,
      email: user.email ?? null,
      user_id: user.id,
      observacoes: null,
      nivel_cefr: null,
      objetivo: null,
      pontos_fortes: null,
      pontos_desenvolver: null,
      data_nascimento: metadata?.data_nascimento ?? null,
      sexo: metadata?.sexo ?? null,
      foto_url: null,
      criado_em: new Date().toISOString(),
    };

    return (
      <AlunoMeuPerfilView
        aluno={alunoFallback}
        vinculos={(vinculos as AlunoProfessor[]) ?? []}
        userId={user.id}
        userEmail={user.email ?? ""}
      />
    );
  }

  const { data: professor } = await supabase
    .from("professores")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Conta antiga (criada antes do trigger que cria essa linha existir) -
  // monta um perfil vazio em memória; o primeiro "Salvar" já cria a linha.
  const professorFallback: Professor = professor ?? {
    id: user.id,
    nome: user.email?.split("@")[0] ?? "",
    data_nascimento: null,
    sexo: null,
    foto_url: null,
    contato: null,
    criado_em: new Date().toISOString(),
  };

  return <ProfessorPerfilView professor={professorFallback} userEmail={user.email ?? ""} />;
}
