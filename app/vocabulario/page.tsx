import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AlunoVocabularioView from "@/components/AlunoVocabularioView";
import type { Aluno, Vocabulario } from "@/lib/types";

export default async function VocabularioPage() {
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

  const [{ data: alunos }, { data: vocabulario }] = await Promise.all([
    supabase.from("alunos").select("*").order("nome", { ascending: true }),
    supabase.from("vocabulario").select("*").order("criado_em", { ascending: false }),
  ]);

  return (
    <AlunoVocabularioView
      alunos={(alunos as Aluno[]) ?? []}
      vocabulario={(vocabulario as Vocabulario[]) ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
