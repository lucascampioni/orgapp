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
  aluno: Aluno;
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
    // upsert (não update): contas antigas de aluno podem ainda não ter
    // linha em alunos (o trigger que cria isso só existe pra cadastros
    // feitos depois dele existir).
    const { error } = await supabase
      .from("alunos")
      .upsert({ user_id: userId, ...fields }, { onConflict: "user_id" });
    if (error) {
      console.error("Falha ao salvar perfil", error);
      return;
    }
    setAluno((cur) => ({ ...cur, ...fields }));
  }

  async function uploadFoto(file: File) {
    const url = await uploadAvatar(supabase, userId, file);
    if (!url) return;
    // Inclui nome mesmo aqui (não só foto_url) porque, se essa for a
    // primeira vez que esse aluno salva algo (conta antiga sem linha em
    // alunos ainda), o upsert vira um insert puro - e nome é obrigatório
    // na tabela.
    const { error } = await supabase
      .from("alunos")
      .upsert({ user_id: userId, nome: aluno.nome, foto_url: url }, { onConflict: "user_id" });
    if (error) {
      console.error("Falha ao salvar foto de perfil", error);
      return;
    }
    setAluno((cur) => ({ ...cur, foto_url: url }));
  }

  return (
    <AlunoShell
      userEmail={userEmail}
      vinculos={vinculos}
      vinculoAtivoId={professorIdAtivo}
      onSelecionarVinculo={selecionarVinculo}
    >
      <PerfilForm
        nome={aluno.nome}
        dataNascimento={aluno.data_nascimento}
        sexo={aluno.sexo}
        contato={aluno.contato}
        fotoUrl={aluno.foto_url}
        onSave={salvar}
        onUploadFoto={uploadFoto}
      />
    </AlunoShell>
  );
}
