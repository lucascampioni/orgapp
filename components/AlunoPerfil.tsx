"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type {
  Aluno,
  AlunoProfessor,
  Aula,
  ErroAula,
  Pagamento,
  TarefaAula,
  Vocabulario,
} from "@/lib/types";
import AulaModal from "@/components/AulaModal";
import {
  TabButton,
  dangerLinkClass,
  hoje,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import { NIVEIS_CEFR } from "@/lib/cefr";
import { OBJETIVOS } from "@/lib/objetivos";

type VincularContaResultado = {
  status: "convite_enviado" | "erro";
  mensagem: string | null;
};

type AlunoSubTab = "geral" | "aulas" | "vocabulario" | "pagamentos";

export default function AlunoPerfil({
  aluno: alunoInicial,
  vinculo,
  initialAulas,
  initialTarefasAula,
  initialVocabulario,
  initialPagamentos,
  initialErros,
}: {
  aluno: Aluno;
  vinculo: AlunoProfessor | null;
  initialAulas: Aula[];
  initialTarefasAula: TarefaAula[];
  initialVocabulario: Vocabulario[];
  initialPagamentos: Pagamento[];
  initialErros: ErroAula[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [aluno, setAluno] = useState<Aluno>(alunoInicial);
  const [aulas, setAulas] = useState<Aula[]>(initialAulas);
  const [tarefasAula, setTarefasAula] = useState<TarefaAula[]>(initialTarefasAula);
  const [vocabulario, setVocabulario] = useState<Vocabulario[]>(initialVocabulario);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>(initialPagamentos);
  const [erros, setErros] = useState<ErroAula[]>(initialErros);
  const [sub, setSub] = useState<AlunoSubTab>("geral");
  const [openAulaId, setOpenAulaId] = useState<string | null>(null);

  function updateAluno(
    fields: Partial<
      Pick<
        Aluno,
        "observacoes" | "nome" | "email" | "nivel_cefr" | "objetivo" | "pontos_fortes" | "pontos_desenvolver"
      >
    >,
  ) {
    const prev = aluno;
    setAluno((cur) => ({ ...cur, ...fields }));
    supabase
      .from("alunos")
      .update(fields)
      .eq("id", aluno.id)
      .then(({ error }) => {
        if (error) {
          console.error("Falha ao atualizar aluno", error);
          setAluno(prev);
        }
      });
  }

  async function desvincularAluno() {
    const { error } = await supabase.from("aluno_professor").delete().eq("aluno_id", aluno.id);
    if (error) {
      console.error("Falha ao desvincular aluno", error);
      return;
    }
    router.push("/alunos");
    router.refresh();
  }

  async function vincularContaAluno(email: string): Promise<VincularContaResultado> {
    const { data, error } = await supabase.rpc("convidar_aluno", {
      p_email: email,
      p_aluno_id: aluno.id,
    });
    if (error || !data) {
      return { status: "erro", mensagem: error?.message ?? "Falha ao enviar convite" };
    }
    setAluno((cur) => ({ ...cur, email }));
    return { status: "convite_enviado", mensagem: null };
  }

  async function addAula(titulo: string, data: string) {
    const { data: row, error } = await supabase
      .from("aulas")
      .insert({ aluno_id: aluno.id, turma_id: null, titulo, data: data || null, status: "planejada" })
      .select()
      .single();
    if (error || !row) {
      console.error("Falha ao adicionar aula", error);
      return;
    }
    setAulas((prev) => [...prev, row as Aula]);
  }

  async function updateAula(id: string, fields: Partial<Aula>) {
    const prevAulas = aulas;
    setAulas((prev) => prev.map((a) => (a.id === id ? { ...a, ...fields } : a)));
    const { error } = await supabase.from("aulas").update(fields).eq("id", id);
    if (error) {
      console.error("Falha ao atualizar aula", error);
      setAulas(prevAulas);
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
        setAulas((prev) => prev.map((a) => (a.id === id ? { ...a, recall_bot_id: body.botId! } : a)));
      }
    }
  }

  async function removeAula(id: string) {
    const prevAulas = aulas;
    setAulas((prev) => prev.filter((a) => a.id !== id));
    const { error } = await supabase.from("aulas").delete().eq("id", id);
    if (error) {
      console.error("Falha ao remover aula", error);
      setAulas(prevAulas);
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
      console.error("Falha ao atualizar tarefa da aula", error);
      setTarefasAula(prev);
    }
  }

  async function removeTarefaAula(id: string) {
    const prev = tarefasAula;
    setTarefasAula((cur) => cur.filter((t) => t.id !== id));
    const { error } = await supabase.from("tarefas_aula").delete().eq("id", id);
    if (error) {
      console.error("Falha ao remover tarefa da aula", error);
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
      console.error("Falha ao adicionar tarefa da aula", error);
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
      setTarefasAula((prev) => [
        ...prev.filter((t) => t.aula_id !== aulaId),
        ...(tarefas as TarefaAula[]),
      ]);
    }
    if (vocab) {
      setVocabulario((prev) => [
        ...prev.filter((v) => v.aula_id !== aulaId),
        ...(vocab as Vocabulario[]),
      ]);
    }
    if (errosData) {
      setErros((prev) => [
        ...prev.filter((e) => e.aula_id !== aulaId),
        ...(errosData as ErroAula[]),
      ]);
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

  async function addVocabulario(termo: string, significado: string, exemplo: string) {
    const { data, error } = await supabase
      .from("vocabulario")
      .insert({
        aluno_id: aluno.id,
        termo,
        significado: significado.trim() || null,
        exemplo: exemplo.trim() || null,
      })
      .select()
      .single();
    if (error || !data) {
      console.error("Falha ao adicionar vocabulário", error);
      return;
    }
    setVocabulario((prev) => [data as Vocabulario, ...prev]);
  }

  async function removeVocabulario(id: string) {
    const prev = vocabulario;
    setVocabulario((cur) => cur.filter((v) => v.id !== id));
    const { error } = await supabase.from("vocabulario").delete().eq("id", id);
    if (error) {
      console.error("Falha ao remover vocabulário", error);
      setVocabulario(prev);
    }
  }

  async function addPagamento(valor: number, vencimento: string, observacoes: string) {
    const { data, error } = await supabase
      .from("pagamentos")
      .insert({ aluno_id: aluno.id, valor, vencimento, observacoes: observacoes.trim() || null })
      .select()
      .single();
    if (error || !data) {
      console.error("Falha ao adicionar pagamento", error);
      return;
    }
    setPagamentos((prev) => [...prev, data as Pagamento]);
  }

  async function marcarPago(id: string) {
    const prev = pagamentos;
    const pagoEm = hoje();
    setPagamentos((cur) => cur.map((p) => (p.id === id ? { ...p, pago_em: pagoEm } : p)));
    const { error } = await supabase.from("pagamentos").update({ pago_em: pagoEm }).eq("id", id);
    if (error) {
      console.error("Falha ao marcar pagamento", error);
      setPagamentos(prev);
    }
  }

  async function removePagamento(id: string) {
    const prev = pagamentos;
    setPagamentos((cur) => cur.filter((p) => p.id !== id));
    const { error } = await supabase.from("pagamentos").delete().eq("id", id);
    if (error) {
      console.error("Falha ao remover pagamento", error);
      setPagamentos(prev);
    }
  }

  const hojeStr = hoje();
  const pendencias = tarefasAula.filter((t) => !t.concluida && aulas.some((a) => a.id === t.aula_id));
  const proximasAulas = aulas
    .filter((a) => a.status === "planejada" && a.data && a.data >= hojeStr)
    .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));
  const historicoAulas = aulas
    .filter((a) => a.status === "dada" || !a.data || a.data < hojeStr)
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
  const openAula = aulas.find((a) => a.id === openAulaId) ?? null;

  return (
    <div>
      <Link href="/alunos" className="mb-4 inline-block text-sm text-muted transition hover:text-ink">
        ← Voltar pros alunos
      </Link>

      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            defaultValue={aluno.nome}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value && value !== aluno.nome) updateAluno({ nome: value });
            }}
            className="font-display -ml-1 rounded-lg border border-transparent bg-transparent px-1 text-2xl font-semibold text-ink outline-none focus:border-border focus:bg-surface-2"
          />
          {aluno.nivel_cefr && (
            <span className="rounded-full border border-brand px-2 py-0.5 text-[11px] font-semibold uppercase text-brand">
              {aluno.nivel_cefr}
            </span>
          )}
          {aluno.objetivo && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
              {OBJETIVOS.find((o) => o.key === aluno.objetivo)?.label ?? aluno.objetivo}
            </span>
          )}
          {vinculo?.idioma && (
            <span className="rounded-full border border-teal px-2 py-0.5 text-[11px] text-teal">
              {vinculo.idioma}
            </span>
          )}
        </div>
        {aluno.contato && <div className="mt-0.5 text-[13px] text-muted">{aluno.contato}</div>}
      </div>

      <AlunoContaBanner aluno={aluno} onVincularConta={vincularContaAluno} />

      <div className="mb-5 flex flex-wrap gap-2">
        <TabButton active={sub === "geral"} label="Visão geral" onClick={() => setSub("geral")} />
        <TabButton
          active={sub === "aulas"}
          label={`Aulas${pendencias.length > 0 ? ` (${pendencias.length})` : ""}`}
          onClick={() => setSub("aulas")}
        />
        <TabButton
          active={sub === "vocabulario"}
          label="Vocabulário novo"
          onClick={() => setSub("vocabulario")}
        />
        <TabButton
          active={sub === "pagamentos"}
          label="Pagamentos"
          onClick={() => setSub("pagamentos")}
        />
      </div>

      {sub === "geral" && (
        <AlunoGeral
          aluno={aluno}
          proximaAula={proximasAulas[0] ?? null}
          pendencias={pendencias.length}
          onUpdateAluno={updateAluno}
          onDesvincular={desvincularAluno}
        />
      )}

      {sub === "aulas" && (
        <AlunoAulas
          proximasAulas={proximasAulas}
          historicoAulas={historicoAulas}
          tarefasAula={tarefasAula}
          onAddAula={addAula}
          onOpenAula={setOpenAulaId}
        />
      )}

      {sub === "vocabulario" && (
        <AlunoVocabulario
          vocabulario={vocabulario}
          onAdd={addVocabulario}
          onRemove={removeVocabulario}
        />
      )}

      {sub === "pagamentos" && (
        <AlunoPagamentos
          pagamentos={pagamentos}
          onAdd={addPagamento}
          onMarcarPago={marcarPago}
          onRemove={removePagamento}
        />
      )}

      {openAula && (
        <AulaModal
          aula={openAula}
          alunos={[aluno]}
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

function AlunoContaBanner({
  aluno,
  onVincularConta,
}: {
  aluno: Aluno;
  onVincularConta: (email: string) => Promise<VincularContaResultado>;
}) {
  const [emailAluno, setEmailAluno] = useState(aluno.email ?? "");
  const [vinculando, setVinculando] = useState(false);
  const [msgVinculo, setMsgVinculo] = useState<string | null>(null);

  async function handleVincularConta() {
    if (!emailAluno.trim()) return;
    setVinculando(true);
    setMsgVinculo(null);
    const resultado = await onVincularConta(emailAluno.trim());
    setVinculando(false);
    setMsgVinculo(
      resultado.status === "convite_enviado"
        ? "Convite enviado! Assim que o aluno aceitar (na conta dele, com esse e-mail), o vínculo passa a valer."
        : resultado.mensagem ?? "Não foi possível enviar o convite.",
    );
  }

  if (aluno.user_id) {
    return (
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-success bg-success/5 px-3 py-2 text-sm text-ink">
        <span className="rounded-full border border-success px-1.5 py-0.5 text-[10px] font-medium text-success">
          conta vinculada
        </span>
        <span className="text-xs text-muted">Este aluno já tem cadastro no Lumina.</span>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-xl border-2 border-brand bg-brand/5 p-4">
      <div className="mb-1 flex items-center gap-2">
        <span className="shrink-0 rounded-full border border-brand px-2 py-0.5 text-[10px] font-medium text-brand">
          sem conta
        </span>
        <div className="text-sm font-semibold text-ink">Este aluno ainda não tem cadastro no Lumina</div>
      </div>
      <p className="mb-3 text-xs text-muted">
        Envie um convite pro e-mail do aluno. Funciona tanto se ele já tem conta no Lumina quanto
        se ainda vai criar uma - o convite fica esperando o aceite dele nos dois casos.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          value={emailAluno}
          onChange={(e) => setEmailAluno(e.target.value)}
          placeholder="e-mail da conta do aluno"
          className={`min-w-[180px] flex-1 ${inputClass}`}
        />
        <button
          onClick={handleVincularConta}
          disabled={vinculando || !emailAluno.trim()}
          className={primaryButtonClass}
        >
          {vinculando ? "Enviando..." : "Enviar convite"}
        </button>
      </div>
      {msgVinculo && <div className="mt-2 text-xs text-muted">{msgVinculo}</div>}
    </div>
  );
}

function AlunoGeral({
  aluno,
  proximaAula,
  pendencias,
  onUpdateAluno,
  onDesvincular,
}: {
  aluno: Aluno;
  proximaAula: Aula | null;
  pendencias: number;
  onUpdateAluno: (
    fields: Partial<Pick<Aluno, "observacoes" | "nivel_cefr" | "objetivo" | "pontos_fortes" | "pontos_desenvolver">>,
  ) => void;
  onDesvincular: () => void;
}) {
  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <div className="text-xs text-muted">Próxima aula</div>
          <div className="mt-1 text-sm text-ink">
            {proximaAula
              ? `${proximaAula.titulo} · ${proximaAula.data}${proximaAula.horario ? ` · ${proximaAula.horario}` : ""}`
              : "Nenhuma agendada"}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <div className="text-xs text-muted">Tarefas pendentes</div>
          <div className="mt-1 text-sm text-ink">{pendencias}</div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Nível (CEFR)</label>
          <select
            defaultValue={aluno.nivel_cefr ?? ""}
            onChange={(e) => onUpdateAluno({ nivel_cefr: (e.target.value || null) as Aluno["nivel_cefr"] })}
            className={inputClass}
          >
            <option value="">Não definido</option>
            {NIVEIS_CEFR.map((n) => (
              <option key={n.key} value={n.key}>
                {n.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Objetivo</label>
          <select
            defaultValue={aluno.objetivo ?? ""}
            onChange={(e) => onUpdateAluno({ objetivo: (e.target.value || null) as Aluno["objetivo"] })}
            className={inputClass}
          >
            <option value="">Não definido</option>
            {OBJETIVOS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className={labelClass}>Observações</label>
      <textarea
        defaultValue={aluno.observacoes ?? ""}
        rows={4}
        onBlur={(e) => onUpdateAluno({ observacoes: e.target.value.trim() || null })}
        placeholder="Progresso, dificuldades, preferências..."
        className={`mb-3 resize-none ${inputClass}`}
      />

      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Pontos fortes</label>
          <textarea
            defaultValue={aluno.pontos_fortes ?? ""}
            rows={3}
            onBlur={(e) => onUpdateAluno({ pontos_fortes: e.target.value.trim() || null })}
            placeholder="Boa compreensão auditiva, bom vocabulário..."
            className={`resize-none ${inputClass}`}
          />
        </div>
        <div>
          <label className={labelClass}>Pontos a desenvolver</label>
          <textarea
            defaultValue={aluno.pontos_desenvolver ?? ""}
            rows={3}
            onBlur={(e) => onUpdateAluno({ pontos_desenvolver: e.target.value.trim() || null })}
            placeholder="Past Perfect, preposições, pronúncia do TH..."
            className={`resize-none ${inputClass}`}
          />
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <button onClick={onDesvincular} className={dangerLinkClass}>
          Desvincular este aluno de mim
        </button>
      </div>
    </div>
  );
}

function AlunoAulas({
  proximasAulas,
  historicoAulas,
  tarefasAula,
  onAddAula,
  onOpenAula,
}: {
  proximasAulas: Aula[];
  historicoAulas: Aula[];
  tarefasAula: TarefaAula[];
  onAddAula: (titulo: string, data: string) => Promise<void>;
  onOpenAula: (id: string) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!titulo.trim()) return;
    setSaving(true);
    await onAddAula(titulo.trim(), data);
    setSaving(false);
    setTitulo("");
    setData("");
  }

  function AulaRow({ aula }: { aula: Aula }) {
    const pendentes = tarefasAula.filter((t) => t.aula_id === aula.id && !t.concluida).length;
    return (
      <div
        onClick={() => onOpenAula(aula.id)}
        className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-surface-2 p-2.5 transition hover:border-brand"
      >
        <div>
          <div className="text-sm text-ink">{aula.titulo}</div>
          <div className="text-xs text-muted">
            {aula.data ?? "sem data"}
            {aula.horario ? ` · ${aula.horario}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendentes > 0 && <span className="text-xs text-brand">{pendentes} pendente(s)</span>}
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              aula.status === "dada" ? "bg-success text-brand-ink" : "bg-surface-3 text-muted"
            }`}
          >
            {aula.status === "dada" ? "Dada" : "Planejada"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-border bg-surface-2 p-3">
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título da nova aula..."
          className={`min-w-[160px] flex-1 ${inputClass}`}
        />
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={inputClass}
          style={{ width: "auto" }}
        />
        <button onClick={handleAdd} disabled={saving} className={primaryButtonClass}>
          Agendar
        </button>
      </div>

      <div className="mb-2 text-xs font-medium text-muted">Próximas aulas</div>
      <div className="mb-4 flex flex-col gap-2">
        {proximasAulas.length === 0 && (
          <div className="text-sm text-muted">Nenhuma aula agendada.</div>
        )}
        {proximasAulas.map((a) => (
          <AulaRow key={a.id} aula={a} />
        ))}
      </div>

      <div className="mb-2 text-xs font-medium text-muted">Histórico</div>
      <div className="flex flex-col gap-2">
        {historicoAulas.length === 0 && (
          <div className="text-sm text-muted">Nenhuma aula anterior ainda.</div>
        )}
        {historicoAulas.map((a) => (
          <AulaRow key={a.id} aula={a} />
        ))}
      </div>
    </div>
  );
}

function AlunoVocabulario({
  vocabulario,
  onAdd,
  onRemove,
}: {
  vocabulario: Vocabulario[];
  onAdd: (termo: string, significado: string, exemplo: string) => Promise<void>;
  onRemove: (id: string) => void;
}) {
  const [termo, setTermo] = useState("");
  const [significado, setSignificado] = useState("");
  const [exemplo, setExemplo] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!termo.trim()) return;
    setSaving(true);
    await onAdd(termo.trim(), significado, exemplo);
    setSaving(false);
    setTermo("");
    setSignificado("");
    setExemplo("");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-border bg-surface-2 p-3">
        <input
          type="text"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Palavra ou expressão..."
          className={`min-w-[140px] flex-1 ${inputClass}`}
        />
        <input
          type="text"
          value={significado}
          onChange={(e) => setSignificado(e.target.value)}
          placeholder="Significado / tradução"
          className={`min-w-[140px] flex-1 ${inputClass}`}
        />
        <input
          type="text"
          value={exemplo}
          onChange={(e) => setExemplo(e.target.value)}
          placeholder="Exemplo de uso (opcional)"
          className={`min-w-[140px] flex-1 ${inputClass}`}
        />
        <button onClick={handleAdd} disabled={saving} className={primaryButtonClass}>
          Adicionar
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {vocabulario.length === 0 && (
          <div className="text-sm text-muted">
            Nenhuma palavra ainda. Palavras novas identificadas pela IA nas aulas gravadas aparecem
            aqui automaticamente.
          </div>
        )}
        {vocabulario.map((v) => (
          <div
            key={v.id}
            className="flex items-start justify-between gap-2 rounded-lg border border-border bg-surface-2 p-2.5"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-ink">{v.termo}</span>
                {v.aula_id && (
                  <span className="rounded-full border border-teal px-1.5 py-0.5 text-[10px] text-teal">
                    IA
                  </span>
                )}
              </div>
              {v.significado && <div className="text-xs text-muted">{v.significado}</div>}
              {v.exemplo && <div className="text-xs italic text-faint">&ldquo;{v.exemplo}&rdquo;</div>}
            </div>
            <button onClick={() => onRemove(v.id)} title="Remover" className="text-muted hover:text-danger">
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlunoPagamentos({
  pagamentos,
  onAdd,
  onMarcarPago,
  onRemove,
}: {
  pagamentos: Pagamento[];
  onAdd: (valor: number, vencimento: string, observacoes: string) => Promise<void>;
  onMarcarPago: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    const num = Number(valor.replace(",", "."));
    if (!num || !vencimento) return;
    setSaving(true);
    await onAdd(num, vencimento, observacoes);
    setSaving(false);
    setValor("");
    setVencimento("");
    setObservacoes("");
  }

  const proximos = pagamentos
    .filter((p) => !p.pago_em)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const historico = pagamentos
    .filter((p) => p.pago_em)
    .sort((a, b) => (b.pago_em ?? "").localeCompare(a.pago_em ?? ""));

  function Row({ p }: { p: Pagamento }) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 p-2.5">
        <div>
          <div className="text-sm text-ink">
            R$ {p.valor.toFixed(2)} · vence {p.vencimento}
          </div>
          {p.observacoes && <div className="text-xs text-muted">{p.observacoes}</div>}
          {p.pago_em && <div className="text-xs text-success">Pago em {p.pago_em}</div>}
        </div>
        <div className="flex items-center gap-2">
          {!p.pago_em && (
            <button onClick={() => onMarcarPago(p.id)} className={secondaryButtonClass}>
              Marcar pago
            </button>
          )}
          <button onClick={() => onRemove(p.id)} title="Remover" className="text-muted hover:text-danger">
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-border bg-surface-2 p-3">
        <input
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Valor (ex: 150)"
          className={`min-w-[120px] ${inputClass}`}
          style={{ width: "auto" }}
        />
        <input
          type="date"
          value={vencimento}
          onChange={(e) => setVencimento(e.target.value)}
          className={inputClass}
          style={{ width: "auto" }}
        />
        <input
          type="text"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Observação (opcional)"
          className={`min-w-[140px] flex-1 ${inputClass}`}
        />
        <button onClick={handleAdd} disabled={saving} className={primaryButtonClass}>
          Adicionar
        </button>
      </div>

      <div className="mb-2 text-xs font-medium text-muted">Próximos pagamentos</div>
      <div className="mb-4 flex flex-col gap-2">
        {proximos.length === 0 && <div className="text-sm text-muted">Nada pendente.</div>}
        {proximos.map((p) => (
          <Row key={p.id} p={p} />
        ))}
      </div>

      <div className="mb-2 text-xs font-medium text-muted">Histórico</div>
      <div className="flex flex-col gap-2">
        {historico.length === 0 && <div className="text-sm text-muted">Nenhum pagamento registrado ainda.</div>}
        {historico.map((p) => (
          <Row key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}
