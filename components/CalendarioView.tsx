"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Aluno, Aula, ErroAula, TarefaAula, Turma, Vocabulario } from "@/lib/types";
import AulaModal from "@/components/AulaModal";
import GoogleCalendarPainel from "@/components/GoogleCalendarPainel";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";

type GoogleVinculo = {
  id: string;
  aluno_id: string;
  google_recurring_event_id: string;
  titulo: string | null;
};

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function hojeStr() {
  return new Date().toISOString().slice(0, 10);
}

function primeiroDiaDoMes(ano: number, mes: number) {
  return new Date(ano, mes, 1);
}

/** Grade de 6 semanas (42 dias) começando no domingo antes/igual ao dia 1. */
function gerarGrade(ano: number, mes: number): Date[] {
  const inicio = primeiroDiaDoMes(ano, mes);
  const offset = inicio.getDay();
  const primeiroDaGrade = new Date(ano, mes, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(primeiroDaGrade);
    d.setDate(primeiroDaGrade.getDate() + i);
    return d;
  });
}

function paraISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function CalendarioView({
  initialAulas,
  alunos,
  turmas,
  initialTarefasAula,
  initialVocabulario,
  initialErros,
  googleConectado,
  googleEmail,
  googleVinculos,
}: {
  initialAulas: Aula[];
  alunos: Aluno[];
  turmas: Turma[];
  initialTarefasAula: TarefaAula[];
  initialVocabulario: Vocabulario[];
  initialErros: ErroAula[];
  googleConectado: boolean;
  googleEmail: string | null;
  googleVinculos: GoogleVinculo[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const hoje = new Date();

  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [aulas, setAulas] = useState<Aula[]>(initialAulas);
  const [tarefasAula, setTarefasAula] = useState<TarefaAula[]>(initialTarefasAula);
  const [vocabulario, setVocabulario] = useState<Vocabulario[]>(initialVocabulario);
  const [erros, setErros] = useState<ErroAula[]>(initialErros);
  const [openAulaId, setOpenAulaId] = useState<string | null>(null);
  const [diaNovaAula, setDiaNovaAula] = useState<string | null>(null);

  const alunoPorId = new Map(alunos.map((a) => [a.id, a]));
  const aulasPorDia = useMemo(() => {
    const map = new Map<string, Aula[]>();
    for (const a of aulas) {
      if (!a.data) continue;
      const lista = map.get(a.data) ?? [];
      lista.push(a);
      map.set(a.data, lista);
    }
    return map;
  }, [aulas]);

  async function refetchAulas() {
    const { data } = await supabase.from("aulas").select("*");
    if (data) setAulas(data as Aula[]);
  }

  async function addAula(alunoId: string, titulo: string, data: string) {
    const { data: row, error } = await supabase
      .from("aulas")
      .insert({ aluno_id: alunoId, turma_id: null, titulo, data, status: "planejada" })
      .select()
      .single();
    if (error || !row) {
      console.error("Falha ao adicionar aula", error);
      return;
    }
    setAulas((prev) => [...prev, row as Aula]);
    setDiaNovaAula(null);
  }

  async function updateAula(id: string, fields: Partial<Aula>) {
    const prev = aulas;
    setAulas((cur) => cur.map((a) => (a.id === id ? { ...a, ...fields } : a)));
    const { error } = await supabase.from("aulas").update(fields).eq("id", id);
    if (error) {
      console.error("Falha ao atualizar aula", error);
      setAulas(prev);
    }
  }

  async function removeAula(id: string) {
    const prev = aulas;
    setAulas((cur) => cur.filter((a) => a.id !== id));
    const { error } = await supabase.from("aulas").delete().eq("id", id);
    if (error) {
      console.error("Falha ao remover aula", error);
      setAulas(prev);
    }
  }

  async function iniciarGravacao(aulaId: string) {
    const res = await fetch("/api/recall/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aulaId }),
    });
    const body = (await res.json()) as { botId?: string; error?: string };
    if (!res.ok || !body.botId) {
      console.error("Falha ao iniciar gravação", body.error);
      return body.error ?? "Falha ao iniciar gravação";
    }
    setAulas((prev) => prev.map((a) => (a.id === aulaId ? { ...a, recall_bot_id: body.botId! } : a)));
    return null;
  }

  async function toggleTarefaAula(tarefa: TarefaAula) {
    const prev = tarefasAula;
    const concluida = !tarefa.concluida;
    setTarefasAula((cur) => cur.map((t) => (t.id === tarefa.id ? { ...t, concluida } : t)));
    const { error } = await supabase.from("tarefas_aula").update({ concluida }).eq("id", tarefa.id);
    if (error) {
      console.error("Falha ao atualizar tarefa", error);
      setTarefasAula(prev);
    }
  }

  async function removeTarefaAula(id: string) {
    const prev = tarefasAula;
    setTarefasAula((cur) => cur.filter((t) => t.id !== id));
    const { error } = await supabase.from("tarefas_aula").delete().eq("id", id);
    if (error) {
      console.error("Falha ao remover tarefa", error);
      setTarefasAula(prev);
    }
  }

  async function refreshAula(aulaId: string) {
    const [{ data: a }, { data: tarefas }, { data: vocab }, { data: errosData }] = await Promise.all([
      supabase.from("aulas").select("*").eq("id", aulaId).single(),
      supabase.from("tarefas_aula").select("*").eq("aula_id", aulaId),
      supabase.from("vocabulario").select("*").eq("aula_id", aulaId),
      supabase.from("erros_aula").select("*").eq("aula_id", aulaId),
    ]);
    if (a) setAulas((prev) => prev.map((x) => (x.id === aulaId ? (a as Aula) : x)));
    if (tarefas) {
      setTarefasAula((prev) => [...prev.filter((t) => t.aula_id !== aulaId), ...(tarefas as TarefaAula[])]);
    }
    if (vocab) {
      setVocabulario((prev) => [...prev.filter((v) => v.aula_id !== aulaId), ...(vocab as Vocabulario[])]);
    }
    if (errosData) {
      setErros((prev) => [...prev.filter((e) => e.aula_id !== aulaId), ...(errosData as ErroAula[])]);
    }
  }

  const grade = gerarGrade(ano, mes);
  const openAula = aulas.find((a) => a.id === openAulaId) ?? null;
  const hojeISO = hojeStr();

  function mesAnterior() {
    if (mes === 0) {
      setMes(11);
      setAno((a) => a - 1);
    } else {
      setMes((m) => m - 1);
    }
  }

  function mesSeguinte() {
    if (mes === 11) {
      setMes(0);
      setAno((a) => a + 1);
    } else {
      setMes((m) => m + 1);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink">Calendário</h1>
        <div className="flex items-center gap-2">
          <button onClick={mesAnterior} className={secondaryButtonClass}>
            ← Anterior
          </button>
          <span className="min-w-[140px] text-center text-sm font-medium text-ink">
            {MESES[mes]} {ano}
          </span>
          <button onClick={mesSeguinte} className={secondaryButtonClass}>
            Seguinte →
          </button>
        </div>
      </div>

      <GoogleCalendarPainel
        conectado={googleConectado}
        googleEmail={googleEmail}
        vinculos={googleVinculos}
        alunos={alunos}
        onAulasCriadas={refetchAulas}
      />

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="bg-surface-2 p-2 text-center text-[11px] font-medium uppercase text-muted">
            {d}
          </div>
        ))}
        {grade.map((dia) => {
          const iso = paraISO(dia);
          const doMes = dia.getMonth() === mes;
          const aulasDoDia = aulasPorDia.get(iso) ?? [];
          const isHoje = iso === hojeISO;

          return (
            <div
              key={iso}
              className={`min-h-[92px] bg-surface p-1.5 ${doMes ? "" : "opacity-40"}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`text-[11px] ${
                    isHoje
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand font-semibold text-brand-ink"
                      : "text-muted"
                  }`}
                >
                  {dia.getDate()}
                </span>
                <button
                  onClick={() => setDiaNovaAula(iso)}
                  title="Nova aula"
                  className="text-[11px] text-muted hover:text-brand"
                >
                  +
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {aulasDoDia.map((a) => {
                  const aluno = a.aluno_id ? alunoPorId.get(a.aluno_id) : null;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setOpenAulaId(a.id)}
                      className={`truncate rounded px-1.5 py-0.5 text-left text-[11px] transition ${
                        a.status === "dada"
                          ? "bg-success/20 text-success"
                          : "bg-brand/15 text-brand"
                      }`}
                      title={`${aluno?.nome ?? "Sem aluno"} · ${a.titulo}`}
                    >
                      {aluno?.nome ?? "Sem aluno"}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {diaNovaAula && (
        <NovaAulaDia
          data={diaNovaAula}
          alunos={alunos}
          onAdd={addAula}
          onClose={() => setDiaNovaAula(null)}
        />
      )}

      {openAula && (
        <AulaModal
          aula={openAula}
          alunos={alunos}
          turmas={turmas}
          tarefas={tarefasAula.filter((t) => t.aula_id === openAula.id)}
          vocabulario={vocabulario.filter((v) => v.aula_id === openAula.id)}
          erros={erros.filter((e) => e.aula_id === openAula.id)}
          onClose={() => setOpenAulaId(null)}
          onSave={(fields) => updateAula(openAula.id, fields)}
          onIniciarGravacao={() => iniciarGravacao(openAula.id)}
          onRefresh={() => refreshAula(openAula.id)}
          onToggleTarefa={toggleTarefaAula}
          onRemoveTarefa={removeTarefaAula}
          onRemoveAula={() => {
            removeAula(openAula.id);
            setOpenAulaId(null);
          }}
        />
      )}
    </div>
  );
}

function NovaAulaDia({
  data,
  alunos,
  onAdd,
  onClose,
}: {
  data: string;
  alunos: Aluno[];
  onAdd: (alunoId: string, titulo: string, data: string) => Promise<void>;
  onClose: () => void;
}) {
  const [alunoId, setAlunoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!alunoId || !titulo.trim()) return;
    setSaving(true);
    await onAdd(alunoId, titulo.trim(), data);
    setSaving(false);
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl shadow-black/40"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-[15px] font-semibold text-ink">Nova aula · {data}</span>
          <button onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        </div>
        <select
          value={alunoId}
          onChange={(e) => setAlunoId(e.target.value)}
          className={`mb-2 ${inputClass}`}
        >
          <option value="">Selecione o aluno</option>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título da aula..."
          className={`mb-3 ${inputClass}`}
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={secondaryButtonClass}>
            Cancelar
          </button>
          <button onClick={handleAdd} disabled={saving || !alunoId} className={primaryButtonClass}>
            {saving ? "Salvando..." : "Criar aula"}
          </button>
        </div>
      </div>
    </div>
  );
}
