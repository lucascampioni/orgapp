"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar } from "@/lib/avatar";
import PerfilForm from "@/components/PerfilForm";
import AlunoShell from "@/components/AlunoShell";
import { useVinculoAtivo } from "@/lib/useVinculoAtivo";
import type { Aluno, AlunoProfessor, Sexo } from "@/lib/types";

export default function AlunoMeuPerfilView({
  aluno: alunoInicial,
  vinculos,
  userId,
  userEmail,
}: {
  aluno: Aluno | null;
  vinculos: AlunoProfessor[];
  userId: string;
  userEmail: string;
}) {
  const [aluno, setAluno] = useState(alunoInicial);
  const supabase = useMemo(() => createClient(), []);
  const [professorIdAtivo, selecionarVinculo] = useVinculoAtivo(vinculos);

  async function salvar(fields: {
    nome: string;
    data_nascimento: string | null;
    sexo: Sexo | null;
    contato: string | null;
  }) {
    if (!aluno) return;
    const { error } = await supabase.from("alunos").update(fields).eq("id", aluno.id);
    if (error) {
      console.error("Falha ao salvar perfil", error);
      return;
    }
    setAluno((cur) => (cur ? { ...cur, ...fields } : cur));
  }

  async function uploadFoto(file: File) {
    if (!aluno) return;
    const url = await uploadAvatar(supabase, userId, file);
    if (!url) return;
    const { error } = await supabase.from("alunos").update({ foto_url: url }).eq("id", aluno.id);
    if (error) {
      console.error("Falha ao salvar foto de perfil", error);
      return;
    }
    setAluno((cur) => (cur ? { ...cur, foto_url: url } : cur));
  }

  return (
    <AlunoShell
      userEmail={userEmail}
      vinculos={vinculos}
      vinculoAtivoId={professorIdAtivo}
      onSelecionarVinculo={selecionarVinculo}
    >
      {aluno ? (
        <PerfilForm
          nome={aluno.nome}
          dataNascimento={aluno.data_nascimento}
          sexo={aluno.sexo}
          contato={aluno.contato}
          fotoUrl={aluno.foto_url}
          onSave={salvar}
          onUploadFoto={uploadFoto}
        />
      ) : (
        <div className="text-sm text-muted">
          Nenhum perfil de aluno vinculado a essa conta ainda. Assim que uma professora te
          convidar e você aceitar, seu perfil aparece aqui.
        </div>
      )}
    </AlunoShell>
  );
}
