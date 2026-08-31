"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Aluno, Aula, TarefaAula } from "@/lib/types";
import { TabButton } from "@/components/ui";

type Filtro = "pendentes" | "concluidas" | "todas";

export default function TarefasLista({
  initialTarefas,
  aulas,
  alunos,
}: {
  initialTarefas: TarefaAula[];
  aulas: Aula[];
  alunos: Aluno[];
}) {
  const [tarefas, setTarefas] = useState<TarefaAula[]>(initialTarefas);
  const [filtro, setFiltro] = useState<Filtro>("pendentes");
  const supabase = useMemo(() => createClient(), []);

  const aulaPorId = new Map(aulas.map((a) => [a.id, a]));
  const alunoPorId = new Map(alunos.map((a) => [a.id, a]));

  async function toggleTarefa(tarefa: TarefaAula) {
    const prev = tarefas;
    const concluida = !tarefa.concluida;
    setTarefas((cur) => cur.map((t) => (t.id === tarefa.id ? { ...t, concluida } : t)));
    const { error } = await supabase.from("tarefas_aula").update({ concluida }).eq("id", tarefa.id);
    if (error) {
      console.error("Falha ao atualizar tarefa", error);
      setTarefas(prev);
    }
  }

  async function removeTarefa(id: string) {
    const prev = tarefas;
    setTarefas((cur) => cur.filter((t) => t.id !== id));
    const { error } = await supabase.from("tarefas_aula").delete().eq("id", id);
    if (error) {
      console.error("Falha ao remover tarefa", error);
      setTarefas(prev);
    }
  }

  const visiveis = tarefas
    .filter((t) => {
      if (filtro === "pendentes") return !t.concluida;
      if (filtro === "concluidas") return t.concluida;
      return true;
    })
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em));

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl font-semibold text-ink">Tarefas</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton
          active={filtro === "pendentes"}
          label="Pendentes"
          onClick={() => setFiltro("pendentes")}
        />
        <TabButton
          active={filtro === "concluidas"}
          label="Concluídas"
          onClick={() => setFiltro("concluidas")}
        />
        <TabButton active={filtro === "todas"} label="Todas" onClick={() => setFiltro("todas")} />
      </div>

      <div className="flex flex-col gap-2">
        {visiveis.length === 0 && (
          <div className="text-sm text-muted">Nada por aqui.</div>
        )}
        {visiveis.map((t) => {
          const aula = aulaPorId.get(t.aula_id);
          const aluno = aula?.aluno_id ? alunoPorId.get(aula.aluno_id) : null;
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <input
                type="checkbox"
                checked={t.concluida}
                onChange={() => toggleTarefa(t)}
                className="h-4 w-4 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm ${t.concluida ? "text-muted line-through" : "text-ink"}`}
                >
                  {t.descricao}
                </div>
                <div className="text-xs text-muted">
                  {aluno ? (
                    <Link href={`/alunos/${aluno.id}`} className="hover:text-brand hover:underline">
                      {aluno.nome}
                    </Link>
                  ) : (
                    "Sem aluno"
                  )}
                  {aula?.titulo ? ` · ${aula.titulo}` : ""}
                </div>
              </div>
              <button
                onClick={() => removeTarefa(t.id)}
                title="Remover"
                className="shrink-0 text-muted hover:text-danger"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
