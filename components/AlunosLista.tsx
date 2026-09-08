"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Aluno, AlunoProfessor, Aula, Convite, TarefaAula } from "@/lib/types";
import { hoje, inputClass, primaryButtonClass, TabButton } from "@/components/ui";

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

  async function addAluno(nome: string, contato: string) {
    const { data, error } = await supabase.rpc("criar_aluno", {
      p_nome: nome,
      p_contato: contato.trim() || null,
    });
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

  async function convidarAluno(email: string): Promise<string | null> {
    const { data, error } = await supabase.rpc("convidar_aluno", { p_email: email });
    if (error || !data) {
      console.error("Falha ao convidar aluno", error);
      return error?.message ?? "Falha ao enviar convite";
    }
    setConvites((prev) => [data as Convite, ...prev.filter((c) => c.id !== (data as Convite).id)]);
    return null;
  }

  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [saving, setSaving] = useState(false);
  const [jaTemCadastro, setJaTemCadastro] = useState(false);
  const [emailConvite, setEmailConvite] = useState("");
  const [erroConvite, setErroConvite] = useState<string | null>(null);
  const [enviandoConvite, setEnviandoConvite] = useState(false);

  async function handleAdd() {
    if (!nome.trim()) return;
    setSaving(true);
    await addAluno(nome.trim(), contato);
    setSaving(false);
    setNome("");
    setContato("");
  }

  async function handleConvidar() {
    if (!emailConvite.trim()) return;
    setEnviandoConvite(true);
    setErroConvite(null);
    const erro = await convidarAluno(emailConvite.trim());
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
        <div className="mb-3 flex gap-2">
          <TabButton
            active={!jaTemCadastro}
            label="Aluno novo"
            onClick={() => {
              setJaTemCadastro(false);
              setErroConvite(null);
            }}
          />
          <TabButton
            active={jaTemCadastro}
            label="Já tem cadastro"
            onClick={() => {
              setJaTemCadastro(true);
              setErroConvite(null);
            }}
          />
        </div>

        {!jaTemCadastro && (
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do aluno..."
              className={`min-w-[160px] flex-1 ${inputClass}`}
            />
            <input
              type="text"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              placeholder="Contato (opcional)"
              className={`min-w-[160px] flex-1 ${inputClass}`}
            />
            <button onClick={handleAdd} disabled={saving} className={primaryButtonClass}>
              Adicionar aluno
            </button>
          </div>
        )}

        {jaTemCadastro && (
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
              O aluno recebe um convite e só passa a aparecer aqui depois de aceitar - assim
              não vinculamos ninguém sem confirmação.
            </p>
            {erroConvite && <p className="mt-2 text-xs text-danger">{erroConvite}</p>}
          </div>
        )}
      </div>

      {convites.some((c) => c.status === "pendente") && (
        <div className="mb-6">
          <div className="mb-2 text-xs font-medium text-muted">Convites pendentes</div>
          <div className="flex flex-col gap-1.5">
            {convites
              .filter((c) => c.status === "pendente")
              .map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted"
                >
                  <span>{c.email}</span>
                  <span className="text-xs">aguardando aceite</span>
                </div>
              ))}
          </div>
        </div>
      )}

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
