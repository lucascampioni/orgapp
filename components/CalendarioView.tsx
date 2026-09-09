"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Aluno, Aula, ErroAula, TarefaAula, Vocabulario } from "@/lib/types";
import AulaModal from "@/components/AulaModal";
import { ModalShell, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function hojeStr() {
  return new Date().toISOString().slice(0, 10);
}

/** Soma dias a uma data "YYYY-MM-DD" sem risco de fuso horário (usa UTC
 * o tempo todo, já que a data em si não tem componente de hora). */
function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
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
  initialTarefasAula,
  initialVocabulario,
  initialErros,
}: {
  initialAulas: Aula[];
  alunos: Aluno[];
  initialTarefasAula: TarefaAula[];
  initialVocabulario: Vocabulario[];
  initialErros: ErroAula[];
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
    for (const lista of map.values()) {
      lista.sort((a, b) => (a.horario ?? "").localeCompare(b.horario ?? ""));
    }
    return map;
  }, [aulas]);

  async function addAula(fields: {
    alunoId: string;
    titulo: string;
    data: string;
    horario: string;
    meetLink: string;
    repetirSemanas: number;
  }): Promise<string | null> {
    const total = Math.max(1, fields.repetirSemanas);
    const linhas = Array.from({ length: total }, (_, i) => ({
      aluno_id: fields.alunoId,
      turma_id: null,
      titulo: fields.titulo,
      data: somarDias(fields.data, i * 7),
      horario: fields.horario || null,
      meet_link: fields.meetLink.trim() || null,
      status: "planejada" as const,
    }));

    const { data: rows, error } = await supabase.from("aulas").insert(linhas).select();
    if (error || !rows) {
      console.error("Falha ao adicionar aula", error);
      return error?.message ?? "Falha ao criar aula";
    }
    const novasAulas = rows as Aula[];
    setAulas((prev) => [...prev, ...novasAulas]);
    setDiaNovaAula(null);

    // Já tem link+data+horário desde a criação - agenda o bot pra entrar
    // sozinho em cada ocorrência, sem precisar reabrir aula por aula.
    if (fields.meetLink.trim()) {
      const comBot = await Promise.all(
        novasAulas.map(async (aula) => {
          const res = await fetch("/api/recall/agendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aulaId: aula.id }),
          });
          const body = (await res.json()) as { botId?: string };
          return body.botId ? { id: aula.id, botId: body.botId } : null;
        }),
      );
      const atualizacoes = new Map(comBot.filter((c) => c !== null).map((c) => [c!.id, c!.botId]));
      if (atualizacoes.size > 0) {
        setAulas((prev) =>
          prev.map((a) => (atualizacoes.has(a.id) ? { ...a, recall_bot_id: atualizacoes.get(a.id)! } : a)),
        );
      }
    }

    return null;
  }

  async function updateAula(id: string, fields: Partial<Aula>) {
    const prev = aulas;
    setAulas((cur) => cur.map((a) => (a.id === id ? { ...a, ...fields } : a)));
    const { error } = await supabase.from("aulas").update(fields).eq("id", id);
    if (error) {
      console.error("Falha ao atualizar aula", error);
      setAulas(prev);
      return;
    }
    // Se a aula agora tem link+data+horário, agenda o bot pra entrar
    // sozinho 1 min antes - sem precisar clicar em "iniciar gravação".
    if (fields.meet_link || fields.data || fields.horario || fields.status) {
      const res = await fetch("/api/recall/agendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aulaId: id }),
      });
      const body = (await res.json()) as { botId?: string };
      if (body.botId) {
        setAulas((cur) => cur.map((a) => (a.id === id ? { ...a, recall_bot_id: body.botId! } : a)));
      }
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

  async function addTarefaAula(aulaId: string, descricao: string) {
    const { data, error } = await supabase
      .from("tarefas_aula")
      .insert({ aula_id: aulaId, descricao, tipo: "checklist" })
      .select()
      .single();
    if (error || !data) {
      console.error("Falha ao adicionar tarefa", error);
      return;
    }
    setTarefasAula((prev) => [...prev, data as TarefaAula]);
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

  async function reprocessarAula(aulaId: string) {
    const res = await fetch("/api/recall/reprocessar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aulaId }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      console.error("Falha ao reprocessar aula", body.error);
      return body.error ?? "Falha ao reprocessar";
    }
    await refreshAula(aulaId);
    return null;
  }

  const grade = gerarGrade(ano, mes);
  const openAula = aulas.find((a) => a.id === openAulaId) ?? null;
  const hojeISO = hojeStr();
  const proximasAulas = useMemo(
    () =>
      aulas
        .filter((a) => a.status === "planejada" && a.data && a.data >= hojeISO)
        .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? "") || (a.horario ?? "").localeCompare(b.horario ?? ""))
        .slice(0, 5),
    [aulas, hojeISO],
  );

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

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="bg-surface-2 p-2 text-center text-xs font-medium uppercase text-muted">
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
              className={`min-h-[116px] bg-surface p-1.5 ${doMes ? "" : "opacity-40"}`}
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
                  className="flex h-5 w-5 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-brand"
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
                      className={`truncate rounded px-2 py-1 text-left text-xs transition ${
                        a.status === "dada"
                          ? "bg-success/20 text-success"
                          : "bg-brand/15 text-brand"
                      }`}
                      title={`${a.horario ? `${a.horario} · ` : ""}${aluno?.nome ?? "Sem aluno"} · ${a.titulo}`}
                    >
                      {a.horario ? `${a.horario} ` : ""}
                      {aluno?.nome ?? "Sem aluno"}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-6">
        <h2 className="mb-2 font-display text-sm font-semibold text-ink">Hoje e próximos dias</h2>
        <div className="flex flex-col gap-2">
          {proximasAulas.length === 0 && (
            <div className="text-sm text-muted">Nenhuma aula agendada.</div>
          )}
          {proximasAulas.map((a) => {
            const aluno = a.aluno_id ? alunoPorId.get(a.aluno_id) : null;
            return (
              <button
                key={a.id}
                onClick={() => setOpenAulaId(a.id)}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-left transition hover:border-brand"
              >
                <div>
                  <div className="text-sm text-ink">{aluno?.nome ?? "Sem aluno"}</div>
                  <div className="text-xs text-muted">
                    {a.titulo}
                    {a.data ? ` · ${a.data}` : ""}
                    {a.horario ? ` · ${a.horario}` : ""}
                  </div>
                </div>
                {aluno?.nivel_cefr && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase text-muted">
                    {aluno.nivel_cefr}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

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
          tarefas={tarefasAula.filter((t) => t.aula_id === openAula.id)}
          vocabulario={vocabulario.filter((v) => v.aula_id === openAula.id)}
          erros={erros.filter((e) => e.aula_id === openAula.id)}
          onClose={() => setOpenAulaId(null)}
          onSave={(fields) => updateAula(openAula.id, fields)}
          onIniciarGravacao={() => iniciarGravacao(openAula.id)}
          onRefresh={() => refreshAula(openAula.id)}
          onReprocessar={() => reprocessarAula(openAula.id)}
          onToggleTarefa={toggleTarefaAula}
          onAddTarefa={(descricao) => addTarefaAula(openAula.id, descricao)}
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
  onAdd: (fields: {
    alunoId: string;
    titulo: string;
    data: string;
    horario: string;
    meetLink: string;
    repetirSemanas: number;
  }) => Promise<string | null>;
  onClose: () => void;
}) {
  const [alunoId, setAlunoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [horario, setHorario] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [semanas, setSemanas] = useState("8");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleAdd() {
    if (!alunoId || !titulo.trim()) return;
    setSaving(true);
    setErro(null);
    const repetirSemanas = recorrente ? Math.max(1, Number(semanas) || 1) : 1;
    const resultado = await onAdd({
      alunoId,
      titulo: titulo.trim(),
      data,
      horario,
      meetLink,
      repetirSemanas,
    });
    setSaving(false);
    if (resultado) setErro(resultado);
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-[15px] font-semibold text-ink">Nova aula · {data}</span>
        <button onClick={onClose} title="Fechar" className="text-muted hover:text-ink">
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
        className={`mb-2 ${inputClass}`}
      />
      <div className="mb-2 flex gap-2">
        <input
          type="time"
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
          className={inputClass}
          style={{ width: "auto" }}
        />
        <input
          value={meetLink}
          onChange={(e) => setMeetLink(e.target.value)}
          placeholder="Link da chamada (opcional)"
          className={`flex-1 ${inputClass}`}
        />
      </div>

      <label className="mb-3 flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={recorrente}
          onChange={(e) => setRecorrente(e.target.checked)}
          className="h-4 w-4"
        />
        Repetir toda semana nesse mesmo dia e horário
      </label>
      {recorrente && (
        <div className="mb-3">
          <label className={labelClass}>Por quantas semanas (incluindo essa)</label>
          <input
            type="number"
            min={1}
            max={52}
            value={semanas}
            onChange={(e) => setSemanas(e.target.value)}
            className={inputClass}
            style={{ width: "auto" }}
          />
        </div>
      )}

      {erro && <p className="mb-3 text-xs text-danger">{erro}</p>}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className={secondaryButtonClass}>
          Cancelar
        </button>
        <button onClick={handleAdd} disabled={saving || !alunoId} className={primaryButtonClass}>
          {saving ? "Salvando..." : "Criar aula"}
        </button>
      </div>
    </ModalShell>
  );
}
