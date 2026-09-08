import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AlunoVocabularioView from "@/components/AlunoVocabularioView";
import type { AlunoProfessor, Vocabulario } from "@/lib/types";

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

  const [{ data: vinculos }, { data: vocabulario }] = await Promise.all([
    supabase.from("aluno_professor").select("*"),
    supabase.from("vocabulario").select("*").order("criado_em", { ascending: false }),
  ]);

  return (
    <AlunoVocabularioView
      vinculos={(vinculos as AlunoProfessor[]) ?? []}
      vocabulario={(vocabulario as Vocabulario[]) ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
