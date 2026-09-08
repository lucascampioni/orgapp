"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/avatar";
import PerfilForm from "@/components/PerfilForm";
import ProfessorShell from "@/components/ProfessorShell";
import type { Professor, Sexo } from "@/lib/types";

export default function ProfessorPerfilView({
  professor: professorInicial,
  userEmail,
}: {
  professor: Professor;
  userEmail: string;
}) {
  const [professor, setProfessor] = useState(professorInicial);
  const supabase = useMemo(() => createClient(), []);

  async function salvar(fields: { nome: string; data_nascimento: string | null; sexo: Sexo | null }) {
    // upsert (não update): contas antigas de professora podem ainda não
    // ter linha em professores (o trigger que cria isso só existe pra
    // cadastros feitos depois dele existir).
    const { error } = await supabase.from("professores").upsert({ id: professor.id, ...fields });
    if (error) {
      console.error("Falha ao salvar perfil", error);
      return;
    }
    setProfessor((cur) => ({ ...cur, ...fields }));
  }

  async function uploadFoto(file: File) {
    const url = await uploadAvatar(supabase, professor.id, file);
    if (!url) return;
    // Inclui nome mesmo aqui (não só foto_url) porque, se essa for a
    // primeira vez que essa professora salva algo (conta antiga sem linha
    // em professores ainda), o upsert vira um insert puro - e nome é
    // obrigatório na tabela.
    const { error } = await supabase
      .from("professores")
      .upsert({ id: professor.id, nome: professor.nome, foto_url: url });
    if (error) {
      console.error("Falha ao salvar foto de perfil", error);
      return;
    }
    setProfessor((cur) => ({ ...cur, foto_url: url }));
  }

  return (
    <ProfessorShell userEmail={userEmail}>
      <PerfilForm
        nome={professor.nome}
        dataNascimento={professor.data_nascimento}
        sexo={professor.sexo}
        fotoUrl={professor.foto_url}
        onSave={salvar}
        onUploadFoto={uploadFoto}
      />
    </ProfessorShell>
  );
}
