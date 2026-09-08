"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Aluno, AlunoProfessor, Aula, Convite, TarefaAula } from "@/lib/types";
import { hoje, inputClass, primaryButtonClass } from "@/components/ui";
import { IDIOMAS } from "@/lib/idiomas";

export default function AlunosLista({
  initialAlunos,
  initialAlunoProfessor,
  initialAulas,
  initialTarefasAula,
  initialConvites,
}: {
  initialAlunos: Aluno[];
  initialAlunoProfessor: AlunoProfessor[];
  initialAulas: Aula[];
  initialTarefasAula: TarefaAula[];
  initialConvites: Convite[];
}) {
  const [alunos, setAlunos] = useState<Aluno[]>(initialAlunos);
  const [, setAlunoProfessor] = useState<AlunoProfessor[]>(initialAlunoProfessor);
  const [aulas] = useState<Aula[]>(initialAulas);
  const [tarefasAula] = useState<TarefaAula[]>(initialTarefasAula);
  const [convites, setConvites] = useState<Convite[]>(initialConvites);

  const supabase = useMemo(() => createClient(), []);

  async function addAluno(nome: string, idioma: string) {
    const { data, error } = await supabase.rpc("criar_aluno", { p_nome: nome, p_idioma: idioma || null });
    if (error || !data) {
      console.error("Falha ao adicionar aluno", error);
      return;
    }
    const novoAluno = data as Aluno;
    setAlunos((prev) => [...prev, novoAluno]);

    const { data: vinculo } = await supabase
      .from("aluno_professor")
      .select("*")
      .eq("aluno_id", novoAluno.id)
      .single();
    if (vinculo) {
      setAlunoProfessor((prev) => [...prev, vinculo as AlunoProfessor]);
    }
  }

  async function convidarAluno(email: string, idioma: string): Promise<string | null> {
    const { data, error } = await supabase.rpc("convidar_aluno", {
      p_email: email,
      p_idioma: idioma || null,
    });
    if (error || !data) {
      console.error("Falha ao convidar aluno", error);
      return error?.message ?? "Falha ao enviar convite";
    }
    const convite = data as Convite;
    setConvites((prev) => [convite, ...prev.filter((c) => c.id !== convite.id)]);

    // O vínculo (aluno_professor) já foi criado junto com o convite - a
    // aba do aluno já pode ser editada mesmo antes do aceite, então o card
    // já aparece aqui (com um selo de "convite pendente").
    const [{ data: aluno }, { data: vinculo }] = await Promise.all([
      supabase.from("alunos").select("*").eq("id", convite.aluno_id).single(),
      supabase
        .from("aluno_professor")
        .select("*")
        .eq("aluno_id", convite.aluno_id)
        .eq("professor_id", convite.professor_id)
        .single(),
    ]);
    if (aluno) {
      setAlunos((prev) => (prev.some((a) => a.id === aluno.id) ? prev : [...prev, aluno as Aluno]));
    }
    if (vinculo) {
      setAlunoProfessor((prev) => [
        ...prev.filter((v) => v.id !== (vinculo as AlunoProfessor).id),
        vinculo as AlunoProfessor,
      ]);
    }
    return null;
  }

  const [nome, setNome] = useState("");
  const [idioma, setIdioma] = useState(IDIOMAS[0]);
  const [saving, setSaving] = useState(false);
  const [jaTemCadastro, setJaTemCadastro] = useState(false);
  const [emailConvite, setEmailConvite] = useState("");
  const [erroConvite, setErroConvite] = useState<string | null>(null);
  const [enviandoConvite, setEnviandoConvite] = useState(false);

  async function handleAdd() {
    if (!nome.trim()) return;
    setSaving(true);
    await addAluno(nome.trim(), idioma);
    setSaving(false);
    setNome("");
  }

  async function handleConvidar() {
    if (!emailConvite.trim()) return;
    setEnviandoConvite(true);
    setErroConvite(null);
    const erro = await convidarAluno(emailConvite.trim(), idioma);
    setEnviandoConvite(false);
    if (erro) {
      setErroConvite(erro);
      return;
    }
    setEmailConvite("");
  }

  const hojeStr = hoje();

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-semibold text-ink">Alunos</h1>

      <div className="mb-6 rounded-xl border border-border bg-surface p-3">
        <label className="mb-3 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={jaTemCadastro}
            onChange={(e) => {
              setJaTemCadastro(e.target.checked);
              setErroConvite(null);
            }}
            className="h-4 w-4"
          />
          Esse aluno já tem cadastro no Lumina
        </label>

        <div className="mb-2">
          <label className="mb-1 block text-xs font-medium text-muted">Idioma que você vai ensinar</label>
          <select
            value={idioma}
            onChange={(e) => setIdioma(e.target.value)}
            className={inputClass}
            style={{ width: "auto" }}
          >
            {IDIOMAS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>

        {!jaTemCadastro ? (
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do aluno..."
              className={`min-w-[160px] flex-1 ${inputClass}`}
            />
            <button onClick={handleAdd} disabled={saving} className={primaryButtonClass}>
              Adicionar aluno
            </button>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-2">
              <input
                type="email"
                value={emailConvite}
                onChange={(e) => setEmailConvite(e.target.value)}
                placeholder="E-mail do aluno..."
                className={`min-w-[160px] flex-1 ${inputClass}`}
              />
              <button onClick={handleConvidar} disabled={enviandoConvite} className={primaryButtonClass}>
                {enviandoConvite ? "Enviando..." : "Enviar convite"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              O aluno já aparece na sua lista e você já pode editar a aba dele - só a conta de
              login fica pendente até ele aceitar o convite.
            </p>
            {erroConvite && <p className="mt-2 text-xs text-danger">{erroConvite}</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {alunos.length === 0 && (
          <div className="text-sm text-muted">Nenhum aluno ainda. Adicione o primeiro acima.</div>
        )}
        {alunos.map((aluno) => {
          const minhasAulas = aulas.filter((a) => a.aluno_id === aluno.id);
          const proxima = minhasAulas
            .filter((a) => a.status === "planejada" && a.data && a.data >= hojeStr)
            .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""))[0];
          const pendencias = tarefasAula.filter(
            (t) => !t.concluida && minhasAulas.some((a) => a.id === t.aula_id),
          ).length;
          const conviteAluno = convites.find((c) => c.aluno_id === aluno.id);

          return (
            <Link
              key={aluno.id}
              href={`/alunos/${aluno.id}`}
              className="block rounded-xl border border-border bg-surface p-4 transition hover:border-brand"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-display text-[15px] font-semibold text-ink">
                  {aluno.nome}
                </span>
                {aluno.user_id ? (
                  <span className="shrink-0 rounded-full border border-success px-2 py-0.5 text-[10px] font-medium text-success">
                    conta vinculada
                  </span>
                ) : conviteAluno?.status === "pendente" ? (
                  <span className="shrink-0 rounded-full border border-violet px-2 py-0.5 text-[10px] font-medium text-violet">
                    convite pendente
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-brand px-2 py-0.5 text-[10px] font-medium text-brand">
                    sem conta
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 text-[13px] text-muted">
                <span>
                  {proxima
                    ? `Próxima aula: ${proxima.data}${proxima.horario ? ` · ${proxima.horario}` : ""}`
                    : "Sem próxima aula agendada"}
                </span>
                {pendencias > 0 && <span className="text-brand">{pendencias} tarefa(s) pendente(s)</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
