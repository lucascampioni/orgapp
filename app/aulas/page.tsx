import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AlunoAulasView from "@/components/AlunoAulasView";
import type { AlunoProfessor, Aula } from "@/lib/types";

export default async function AulasPage() {
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

  const [{ data: vinculos }, { data: aulas }] = await Promise.all([
    supabase.from("aluno_professor").select("*"),
    supabase.from("aulas").select("*"),
  ]);

  return (
    <AlunoAulasView
      vinculos={(vinculos as AlunoProfessor[]) ?? []}
      aulas={(aulas as Aula[]) ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
