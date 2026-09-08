"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Aluno, Aula, TarefaAula } from "@/lib/types";
import { TabButton } from "@/components/ui";
import { useAlunoAtivo } from "@/lib/useAlunoAtivo";
import AlunoShell from "@/components/AlunoShell";

type Filtro = "pendentes" | "concluidas";

export default function AlunoTarefasView({
  alunos,
  aulas,
  tarefasAula,
  userEmail,
}: {
  alunos: Aluno[];
  aulas: Aula[];
  tarefasAula: TarefaAula[];
  userEmail: string;
}) {
  const [alunoAtivoId, selecionarAluno] = useAlunoAtivo(alunos);
  const [tarefas, setTarefas] = useState<TarefaAula[]>(tarefasAula);
  const [filtro, setFiltro] = useState<Filtro>("pendentes");
  const supabase = useMemo(() => createClient(), []);

  const aluno = alunos.find((a) => a.id === alunoAtivoId) ?? alunos[0];
  const aulaPorId = new Map(aulas.map((a) => [a.id, a]));

  async function toggleTarefa(t: TarefaAula) {
    const prev = tarefas;
    const concluida = !t.concluida;
    setTarefas((cur) => cur.map((x) => (x.id === t.id ? { ...x, concluida } : x)));
    const { error } = await supabase.from("tarefas_aula").update({ concluida }).eq("id", t.id);
    if (error) {
      console.error("Falha ao atualizar tarefa", error);
      setTarefas(prev);
    }
  }

  async function responderTarefa(t: TarefaAula, resposta: string) {
    const prev = tarefas;
    setTarefas((cur) =>
      cur.map((x) => (x.id === t.id ? { ...x, resposta_aluno: resposta, concluida: true } : x)),
    );
    const { error } = await supabase
      .from("tarefas_aula")
      .update({ resposta_aluno: resposta, concluida: true })
      .eq("id", t.id);
    if (error) {
      console.error("Falha ao responder tarefa", error);
      setTarefas(prev);
    }
  }

  if (!aluno) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-7 text-sm text-muted">
        Nenhum vínculo encontrado ainda.
      </div>
    );
  }

  const minhasAulas = aulas.filter((a) => a.aluno_id === aluno.id);
  const minhasTarefas = tarefas
    .filter((t) => minhasAulas.some((a) => a.id === t.aula_id))
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  const visiveis = minhasTarefas.filter((t) => (filtro === "pendentes" ? !t.concluida : t.concluida));

  return (
    <AlunoShell
      userEmail={userEmail}
      alunos={alunos}
      alunoAtivoId={aluno.id}
      onSelecionarAluno={selecionarAluno}
    >
      <h1 className="mb-4 font-display text-2xl font-semibold text-ink">Tarefas</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton active={filtro === "pendentes"} label="Pendentes" onClick={() => setFiltro("pendentes")} />
        <TabButton active={filtro === "concluidas"} label="Concluídas" onClick={() => setFiltro("concluidas")} />
      </div>

      <div className="flex flex-col gap-2">
        {visiveis.length === 0 && (
          <div className="text-sm text-muted">
            {filtro === "pendentes" ? "Nenhuma tarefa pendente. 🎉" : "Nenhuma tarefa concluída ainda."}
          </div>
        )}
        {visiveis.map((t) => (
          <TarefaCard
            key={t.id}
            tarefa={t}
            aula={aulaPorId.get(t.aula_id)}
            onToggle={() => toggleTarefa(t)}
            onResponder={(resposta) => responderTarefa(t, resposta)}
          />
        ))}
      </div>
    </AlunoShell>
  );
}

function TarefaCard({
  tarefa,
  aula,
  onToggle,
  onResponder,
}: {
  tarefa: TarefaAula;
  aula: Aula | undefined;
  onToggle: () => void;
  onResponder: (resposta: string) => void;
}) {
  const [resposta, setResposta] = useState("");
  const [selecionada, setSelecionada] = useState("");
  const pendente = !tarefa.concluida;

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{aula?.titulo ?? "Aula"}</span>
        {tarefa.tipo !== "checklist" && (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted">
            {tarefa.tipo === "dissertativa" ? "dissertativa" : "múltipla escolha"}
          </span>
        )}
      </div>

      {tarefa.tipo === "checklist" ? (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={tarefa.concluida} onChange={onToggle} className="h-4 w-4" />
          <span className={`text-sm ${tarefa.concluida ? "text-muted line-through" : "text-ink"}`}>
            {tarefa.descricao}
          </span>
        </label>
      ) : (
        <div className="text-sm text-ink">{tarefa.descricao}</div>
      )}

      {tarefa.tipo === "multipla_escolha" && (
        <div className="mt-2">
          {pendente ? (
            <>
              <div className="mb-2 flex flex-col gap-1.5">
                {(tarefa.opcoes ?? []).map((opcao) => (
                  <label key={opcao} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="radio"
                      name={`tarefa-${tarefa.id}`}
                      checked={selecionada === opcao}
                      onChange={() => setSelecionada(opcao)}
                      className="h-4 w-4"
                    />
                    {opcao}
                  </label>
                ))}
              </div>
              <button
                onClick={() => selecionada && onResponder(selecionada)}
                disabled={!selecionada}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-ink transition hover:bg-brand-strong disabled:opacity-50"
              >
                Responder
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              {(tarefa.opcoes ?? []).map((opcao) => {
                const escolhida = tarefa.resposta_aluno === opcao;
                const correta = tarefa.resposta_correta === opcao;
                return (
                  <div
                    key={opcao}
                    className={`rounded-md px-2 py-1 text-xs ${
                      escolhida && correta
                        ? "bg-success/15 text-success"
                        : escolhida
                          ? "bg-danger/15 text-danger"
                          : correta
                            ? "text-success"
                            : "text-muted"
                    }`}
                  >
                    {escolhida ? "● " : "○ "}
                    {opcao}
                    {correta ? " (correta)" : ""}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tarefa.tipo === "dissertativa" && (
        <div className="mt-2">
          {pendente ? (
            <>
              <textarea
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                rows={3}
                placeholder="Escreva sua resposta..."
                className="mb-2 w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand"
              />
              <button
                onClick={() => resposta.trim() && onResponder(resposta.trim())}
                disabled={!resposta.trim()}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-ink transition hover:bg-brand-strong disabled:opacity-50"
              >
                Enviar resposta
              </button>
            </>
          ) : (
            <div className="rounded-md bg-surface-2 px-2 py-1.5 text-xs text-ink">
              {tarefa.resposta_aluno}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
