import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AlunoAulasView from "@/components/AlunoAulasView";
import type { Aluno, Aula } from "@/lib/types";

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

  const [{ data: alunos }, { data: aulas }] = await Promise.all([
    supabase.from("alunos").select("*").order("nome", { ascending: true }),
    supabase.from("aulas").select("*"),
  ]);

  return (
    <AlunoAulasView
      alunos={(alunos as Aluno[]) ?? []}
      aulas={(aulas as Aula[]) ?? []}
      userEmail={user.email ?? ""}
    />
  );
}
