"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NIVEIS, NIVEL_MAP } from "@/lib/niveis";
import type {
  Aluno,
  AlunoProfessor,
  Aula,
  AulaStatus,
  Material,
  MaterialTipo,
  Nivel,
  Pagamento,
  TarefaAula,
  Turma,
  Vocabulario,
} from "@/lib/types";
import LogoutButton from "@/components/LogoutButton";
import Logo from "@/components/Logo";

type Tab = "alunos" | "aulas" | "materiais";

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export default function Dashboard({
  initialTurmas,
  initialAlunos,
  initialAlunoProfessor,
  initialAulas,
  initialMateriais,
  initialTarefasAula,
  initialVocabulario,
  initialPagamentos,
  userEmail,
}: {
  initialTurmas: Turma[];
  initialAlunos: Aluno[];
  initialAlunoProfessor: AlunoProfessor[];
  initialAulas: Aula[];
  initialMateriais: Material[];
  initialTarefasAula: TarefaAula[];
  initialVocabulario: Vocabulario[];
  initialPagamentos: Pagamento[];
  userEmail: string;
}) {
  const [tab, setTab] = useState<Tab>("alunos");
  const [turmas, setTurmas] = useState<Turma[]>(initialTurmas);
  const [alunos, setAlunos] = useState<Aluno[]>(initialAlunos);
  const [alunoProfessor, setAlunoProfessor] = useState<AlunoProfessor[]>(
    initialAlunoProfessor,
  );
  const [aulas, setAulas] = useState<Aula[]>(initialAulas);
  const [materiais, setMateriais] = useState<Material[]>(initialMateriais);
  const [tarefasAula, setTarefasAula] = useState<TarefaAula[]>(initialTarefasAula);
  const [vocabulario, setVocabulario] = useState<Vocabulario[]>(initialVocabulario);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>(initialPagamentos);

  const [openAlunoId, setOpenAlunoId] = useState<string | null>(null);
  const [openAulaId, setOpenAulaId] = useState<string | null>(null);
  const [openMaterialId, setOpenMaterialId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const vinculoPorAluno = useMemo(() => {
    const map = new Map<string, AlunoProfessor>();
    for (const v of alunoProfessor) map.set(v.aluno_id, v);
    return map;
  }, [alunoProfessor]);

  // ---------- Turmas ----------

  async function addTurma(nome: string, nivel: Nivel, horario: string) {
    const { data, error } = await supabase
      .from("turmas")
      .insert({ nome, nivel, horario: horario.trim() || null })
      .select()
      .single();
    if (error || !data) {
      console.error("Falha ao adicionar turma", error);
      return;
    }
    setTurmas((prev) => [...prev, data as Turma]);
  }

  // ---------- Alunos ----------

  async function addAluno(
    nome: string,
    contato: string,
    turmaId: string | null,
  ) {
    const { data, error } = await supabase.rpc("criar_aluno", {
      p_nome: nome,
      p_contato: contato.trim() || null,
      p_turma_id: turmaId,
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

  async function updateAluno(
    id: string,
    fields: Partial<Pick<Aluno, "contato" | "observacoes" | "nome" | "email">>,
  ) {
    const prevAlunos = alunos;
    setAlunos((prev) => prev.map((a) => (a.id === id ? { ...a, ...fields } : a)));
    const { error } = await supabase.from("alunos").update(fields).eq("id", id);
    if (error) {
      console.error("Falha ao atualizar aluno", error);
      setAlunos(prevAlunos);
    }
  }

  async function updateVinculoTurma(alunoId: string, turmaId: string | null) {
    const prev = alunoProfessor;
    setAlunoProfessor((cur) =>
      cur.map((v) => (v.aluno_id === alunoId ? { ...v, turma_id: turmaId } : v)),
    );
    const { error } = await supabase
      .from("aluno_professor")
      .update({ turma_id: turmaId })
      .eq("aluno_id", alunoId);
    if (error) {
      console.error("Falha ao atualizar turma do aluno", error);
      setAlunoProfessor(prev);
    }
  }

  async function desvincularAluno(alunoId: string) {
    const prevVinculos = alunoProfessor;
    const prevAlunos = alunos;
    setAlunoProfessor((prev) => prev.filter((v) => v.aluno_id !== alunoId));
    setAlunos((prev) => prev.filter((a) => a.id !== alunoId));
    const { error } = await supabase
      .from("aluno_professor")
      .delete()
      .eq("aluno_id", alunoId);
    if (error) {
      console.error("Falha ao desvincular aluno", error);
      setAlunoProfessor(prevVinculos);
      setAlunos(prevAlunos);
    }
  }

  async function vincularAlunoPorEmail(alunoId: string, email: string) {
    const { error } = await supabase.rpc("vincular_aluno_por_email", {
      p_aluno_id: alunoId,
      p_email: email,
    });
    if (error) {
      return error.message;
    }
    return null;
  }

  async function vincularContaAluno(alunoId: string, email: string) {
    const { data, error } = await supabase.rpc("vincular_conta_aluno_por_professora", {
      p_aluno_id: alunoId,
      p_email: email,
    });
    if (error) {
      return { status: "erro" as const, mensagem: error.message };
    }
    if (data === "vinculado") {
      const { data: atualizado } = await supabase
        .from("alunos")
        .select("*")
        .eq("id", alunoId)
        .single();
      if (atualizado) {
        setAlunos((prev) => prev.map((a) => (a.id === alunoId ? (atualizado as Aluno) : a)));
      }
    } else {
      setAlunos((prev) => prev.map((a) => (a.id === alunoId ? { ...a, email } : a)));
    }
    return { status: data as "vinculado" | "nao_encontrado" | "sem_email", mensagem: null };
  }

  // ---------- Aulas ----------

  async function addAula(
    alunoId: string,
    turmaId: string | null,
    titulo: string,
    data: string,
  ) {
    const { data: row, error } = await supabase
      .from("aulas")
      .insert({
        aluno_id: alunoId,
        turma_id: turmaId,
        titulo,
        data: data || null,
        status: "planejada",
      })
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
    setAulas((prev) =>
      prev.map((a) => (a.id === aulaId ? { ...a, recall_bot_id: body.botId! } : a)),
    );
    return null;
  }

  async function toggleTarefaAula(tarefa: TarefaAula) {
    const prev = tarefasAula;
    const concluida = !tarefa.concluida;
    setTarefasAula((cur) =>
      cur.map((t) => (t.id === tarefa.id ? { ...t, concluida } : t)),
    );
    const { error } = await supabase
      .from("tarefas_aula")
      .update({ concluida })
      .eq("id", tarefa.id);
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

  async function refreshAula(aulaId: string) {
    const [{ data: aula }, { data: tarefas }, { data: vocab }] = await Promise.all([
      supabase.from("aulas").select("*").eq("id", aulaId).single(),
      supabase.from("tarefas_aula").select("*").eq("aula_id", aulaId),
      supabase.from("vocabulario").select("*").eq("aula_id", aulaId),
    ]);
    if (aula) {
      setAulas((prev) => prev.map((a) => (a.id === aulaId ? (aula as Aula) : a)));
    }
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
  }

  // ---------- Vocabulário ----------

  async function addVocabulario(
    alunoId: string,
    termo: string,
    significado: string,
    exemplo: string,
  ) {
    const { data, error } = await supabase
      .from("vocabulario")
      .insert({
        aluno_id: alunoId,
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

  // ---------- Pagamentos ----------

  async function addPagamento(
    alunoId: string,
    valor: number,
    vencimento: string,
    observacoes: string,
  ) {
    const { data, error } = await supabase
      .from("pagamentos")
      .insert({
        aluno_id: alunoId,
        valor,
        vencimento,
        observacoes: observacoes.trim() || null,
      })
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
    const { error } = await supabase
      .from("pagamentos")
      .update({ pago_em: pagoEm })
      .eq("id", id);
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

  // ---------- Materiais ----------

  async function addMaterial(
    tipo: MaterialTipo,
    titulo: string,
    tema: string,
    nivel: Nivel,
  ) {
    const { data, error } = await supabase
      .from("materiais")
      .insert({ tipo, titulo, tema: tema.trim() || null, nivel })
      .select()
      .single();
    if (error || !data) {
      console.error("Falha ao adicionar material", error);
      return;
    }
    setMateriais((prev) => [data as Material, ...prev]);
  }

  async function updateMaterial(id: string, conteudo: string) {
    const prevMateriais = materiais;
    const value = conteudo.trim() || null;
    setMateriais((prev) => prev.map((m) => (m.id === id ? { ...m, conteudo: value } : m)));
    const { error } = await supabase
      .from("materiais")
      .update({ conteudo: value })
      .eq("id", id);
    if (error) {
      console.error("Falha ao salvar material", error);
      setMateriais(prevMateriais);
    }
  }

  async function removeMaterial(id: string) {
    const prevMateriais = materiais;
    setMateriais((prev) => prev.filter((m) => m.id !== id));
    const { error } = await supabase.from("materiais").delete().eq("id", id);
    if (error) {
      console.error("Falha ao remover material", error);
      setMateriais(prevMateriais);
    }
  }

  const openAluno = alunos.find((a) => a.id === openAlunoId) ?? null;
  const openAula = aulas.find((a) => a.id === openAulaId) ?? null;
  const openMaterial = materiais.find((m) => m.id === openMaterialId) ?? null;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-7">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Logo />
          <div className="mt-1 text-[13px] text-muted">Logado como {userEmail}</div>
        </div>
        <LogoutButton />
      </header>

      <div className="mb-6 flex gap-2">
        <TabButton active={tab === "alunos"} label="Alunos" onClick={() => setTab("alunos")} />
        <TabButton
          active={tab === "aulas"}
          label="Planejador de Aulas"
          onClick={() => setTab("aulas")}
        />
        <TabButton
          active={tab === "materiais"}
          label="Vocabulário e Exercícios"
          onClick={() => setTab("materiais")}
        />
      </div>

      {tab === "alunos" && (
        <AlunosTab
          alunos={alunos}
          turmas={turmas}
          vinculoPorAluno={vinculoPorAluno}
          aulas={aulas}
          tarefasAula={tarefasAula}
          onAddAluno={addAluno}
          onAddTurma={addTurma}
          onOpenAluno={setOpenAlunoId}
        />
      )}

      {tab === "aulas" && (
        <AulasTab
          alunos={alunos}
          turmas={turmas}
          aulas={aulas}
          onAddAula={addAula}
          onOpenAula={setOpenAulaId}
          onRemoveAula={removeAula}
          onToggleStatus={(aula) =>
            updateAula(aula.id, {
              status: aula.status === "planejada" ? "dada" : "planejada",
            })
          }
        />
      )}

      {tab === "materiais" && (
        <MateriaisTab
          materiais={materiais}
          onAddMaterial={addMaterial}
          onOpenMaterial={setOpenMaterialId}
          onRemoveMaterial={removeMaterial}
        />
      )}

      {openAluno && (
        <AlunoModal
          aluno={openAluno}
          vinculo={vinculoPorAluno.get(openAluno.id) ?? null}
          turmas={turmas}
          aulas={aulas.filter((a) => a.aluno_id === openAluno.id)}
          tarefasAula={tarefasAula}
          vocabulario={vocabulario.filter((v) => v.aluno_id === openAluno.id)}
          pagamentos={pagamentos.filter((p) => p.aluno_id === openAluno.id)}
          onClose={() => setOpenAlunoId(null)}
          onUpdateAluno={(fields) => updateAluno(openAluno.id, fields)}
          onUpdateTurma={(turmaId) => updateVinculoTurma(openAluno.id, turmaId)}
          onDesvincular={() => {
            desvincularAluno(openAluno.id);
            setOpenAlunoId(null);
          }}
          onCompartilhar={(email) => vincularAlunoPorEmail(openAluno.id, email)}
          onVincularConta={(email) => vincularContaAluno(openAluno.id, email)}
          onAddAula={(titulo, data) => addAula(openAluno.id, null, titulo, data)}
          onOpenAula={(id) => {
            setOpenAlunoId(null);
            setOpenAulaId(id);
          }}
          onAddVocabulario={(termo, significado, exemplo) =>
            addVocabulario(openAluno.id, termo, significado, exemplo)
          }
          onRemoveVocabulario={removeVocabulario}
          onAddPagamento={(valor, vencimento, observacoes) =>
            addPagamento(openAluno.id, valor, vencimento, observacoes)
          }
          onMarcarPago={marcarPago}
          onRemovePagamento={removePagamento}
        />
      )}

      {openAula && (
        <AulaModal
          aula={openAula}
          alunos={alunos}
          turmas={turmas}
          tarefas={tarefasAula.filter((t) => t.aula_id === openAula.id)}
          vocabulario={vocabulario.filter((v) => v.aula_id === openAula.id)}
          onClose={() => setOpenAulaId(null)}
          onSave={(fields) => updateAula(openAula.id, fields)}
          onIniciarGravacao={() => iniciarGravacao(openAula.id)}
          onRefresh={() => refreshAula(openAula.id)}
          onToggleTarefa={toggleTarefaAula}
          onRemoveTarefa={removeTarefaAula}
        />
      )}

      {openMaterial && (
        <MaterialModal
          material={openMaterial}
          onClose={() => setOpenMaterialId(null)}
          onSave={(conteudo) => updateMaterial(openMaterial.id, conteudo)}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-[13px] font-medium transition ${
        active
          ? "border-brand bg-surface text-ink"
          : "border-border bg-surface text-muted hover:border-brand hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function NivelBadge({ nivel }: { nivel: Nivel | null }) {
  if (!nivel) return null;
  const meta = NIVEL_MAP[nivel];
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide text-brand-ink"
      style={{ background: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function ModalShell({
  onClose,
  children,
  wide,
}: {
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[88vh] w-full overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-2xl shadow-black/40 ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-ink outline-none transition focus:border-brand";
const labelClass = "mb-1 block text-xs font-medium text-muted";
const primaryButtonClass =
  "rounded-lg border border-brand bg-brand px-3 py-1.5 text-[13px] font-semibold text-brand-ink transition hover:bg-brand-strong disabled:opacity-60";
const secondaryButtonClass =
  "rounded-lg border border-border px-3 py-1.5 text-[13px] text-muted transition hover:text-ink";
const dangerLinkClass = "text-[13px] text-muted transition hover:text-danger";

// ---------- Alunos ----------

function AlunosTab({
  alunos,
  turmas,
  vinculoPorAluno,
  aulas,
  tarefasAula,
  onAddAluno,
  onAddTurma,
  onOpenAluno,
}: {
  alunos: Aluno[];
  turmas: Turma[];
  vinculoPorAluno: Map<string, AlunoProfessor>;
  aulas: Aula[];
  tarefasAula: TarefaAula[];
  onAddAluno: (nome: string, contato: string, turmaId: string | null) => Promise<void>;
  onAddTurma: (nome: string, nivel: Nivel, horario: string) => Promise<void>;
  onOpenAluno: (id: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [saving, setSaving] = useState(false);
  const [filtroTurma, setFiltroTurma] = useState<string>("all");
  const [showNovaTurma, setShowNovaTurma] = useState(false);

  async function handleAdd() {
    if (!nome.trim()) return;
    setSaving(true);
    await onAddAluno(nome.trim(), contato, turmaId || null);
    setSaving(false);
    setNome("");
    setContato("");
  }

  const visiveis = alunos.filter((a) => {
    if (filtroTurma === "all") return true;
    return vinculoPorAluno.get(a.id)?.turma_id === filtroTurma;
  });

  const hojeStr = hoje();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TabButton
          active={filtroTurma === "all"}
          label="Todos os alunos"
          onClick={() => setFiltroTurma("all")}
        />
        {turmas.map((t) => (
          <TabButton
            key={t.id}
            active={filtroTurma === t.id}
            label={t.nome}
            onClick={() => setFiltroTurma(t.id)}
          />
        ))}
        <button
          onClick={() => setShowNovaTurma((v) => !v)}
          className="text-[13px] text-muted transition hover:text-brand"
        >
          + turma
        </button>
      </div>

      {showNovaTurma && (
        <NovaTurmaForm
          onAdd={async (n, nv, h) => {
            await onAddTurma(n, nv, h);
            setShowNovaTurma(false);
          }}
        />
      )}

      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
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
        <select
          value={turmaId}
          onChange={(e) => setTurmaId(e.target.value)}
          className={inputClass}
          style={{ width: "auto" }}
        >
          <option value="">Sem turma</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        <button onClick={handleAdd} disabled={saving} className={primaryButtonClass}>
          Adicionar aluno
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.length === 0 && (
          <div className="text-sm text-muted">Nenhum aluno ainda. Adicione o primeiro acima.</div>
        )}
        {visiveis.map((aluno) => {
          const turma = turmas.find((t) => t.id === vinculoPorAluno.get(aluno.id)?.turma_id);
          const minhasAulas = aulas.filter((a) => a.aluno_id === aluno.id);
          const proxima = minhasAulas
            .filter((a) => a.status === "planejada" && a.data && a.data >= hojeStr)
            .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""))[0];
          const pendencias = tarefasAula.filter(
            (t) => !t.concluida && minhasAulas.some((a) => a.id === t.aula_id),
          ).length;

          return (
            <div
              key={aluno.id}
              onClick={() => onOpenAluno(aluno.id)}
              className="cursor-pointer rounded-xl border border-border bg-surface p-4 transition hover:border-brand"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-display text-[15px] font-semibold text-ink">
                  {aluno.nome}
                </span>
                {turma && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                    {turma.nome}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1 text-[13px] text-muted">
                <span>
                  {proxima ? `Próxima aula: ${proxima.data}` : "Sem próxima aula agendada"}
                </span>
                {pendencias > 0 && <span className="text-brand">{pendencias} tarefa(s) pendente(s)</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NovaTurmaForm({
  onAdd,
}: {
  onAdd: (nome: string, nivel: Nivel, horario: string) => Promise<void>;
}) {
  const [nome, setNome] = useState("");
  const [nivel, setNivel] = useState<Nivel>(NIVEIS[0].key);
  const [horario, setHorario] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!nome.trim()) return;
    setSaving(true);
    await onAdd(nome.trim(), nivel, horario);
    setSaving(false);
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
      <input
        type="text"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Nome da turma..."
        className={`min-w-[160px] flex-1 ${inputClass}`}
      />
      <select
        value={nivel}
        onChange={(e) => setNivel(e.target.value as Nivel)}
        className={inputClass}
        style={{ width: "auto" }}
      >
        {NIVEIS.map((n) => (
          <option key={n.key} value={n.key}>
            {n.label}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={horario}
        onChange={(e) => setHorario(e.target.value)}
        placeholder="Horário (ex: Ter/Qui 19h)"
        className={`min-w-[160px] ${inputClass}`}
        style={{ width: "auto" }}
      />
      <button onClick={handleAdd} disabled={saving} className={primaryButtonClass}>
        Criar turma
      </button>
    </div>
  );
}

type AlunoSubTab = "geral" | "aulas" | "vocabulario" | "pagamentos";

type VincularContaResultado = {
  status: "vinculado" | "nao_encontrado" | "sem_email" | "erro";
  mensagem: string | null;
};

function AlunoModal({
  aluno,
  vinculo,
  turmas,
  aulas,
  tarefasAula,
  vocabulario,
  pagamentos,
  onClose,
  onUpdateAluno,
  onUpdateTurma,
  onDesvincular,
  onCompartilhar,
  onVincularConta,
  onAddAula,
  onOpenAula,
  onAddVocabulario,
  onRemoveVocabulario,
  onAddPagamento,
  onMarcarPago,
  onRemovePagamento,
}: {
  aluno: Aluno;
  vinculo: AlunoProfessor | null;
  turmas: Turma[];
  aulas: Aula[];
  tarefasAula: TarefaAula[];
  vocabulario: Vocabulario[];
  pagamentos: Pagamento[];
  onClose: () => void;
  onUpdateAluno: (
    fields: Partial<Pick<Aluno, "contato" | "observacoes" | "nome" | "email">>,
  ) => void;
  onUpdateTurma: (turmaId: string | null) => void;
  onDesvincular: () => void;
  onCompartilhar: (email: string) => Promise<string | null>;
  onVincularConta: (email: string) => Promise<VincularContaResultado>;
  onAddAula: (titulo: string, data: string) => Promise<void>;
  onOpenAula: (id: string) => void;
  onAddVocabulario: (termo: string, significado: string, exemplo: string) => Promise<void>;
  onRemoveVocabulario: (id: string) => void;
  onAddPagamento: (valor: number, vencimento: string, observacoes: string) => Promise<void>;
  onMarcarPago: (id: string) => void;
  onRemovePagamento: (id: string) => void;
}) {
  const [sub, setSub] = useState<AlunoSubTab>("geral");
  const hojeStr = hoje();

  const pendencias = tarefasAula.filter(
    (t) => !t.concluida && aulas.some((a) => a.id === t.aula_id),
  );
  const proximasAulas = aulas
    .filter((a) => a.status === "planejada" && a.data && a.data >= hojeStr)
    .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));
  const historicoAulas = aulas
    .filter((a) => a.status === "dada" || !a.data || a.data < hojeStr)
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));

  return (
    <ModalShell onClose={onClose} wide>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <input
            defaultValue={aluno.nome}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value && value !== aluno.nome) onUpdateAluno({ nome: value });
            }}
            className="font-display -ml-1 rounded-lg border border-transparent bg-transparent px-1 text-[18px] font-semibold text-ink outline-none focus:border-border focus:bg-surface-2"
          />
          {aluno.contato && <div className="mt-0.5 text-[13px] text-muted">{aluno.contato}</div>}
        </div>
        <button onClick={onClose} title="Fechar" className="text-muted hover:text-ink">
          ✕
        </button>
      </div>

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
          vinculo={vinculo}
          turmas={turmas}
          proximaAula={proximasAulas[0] ?? null}
          pendencias={pendencias.length}
          onUpdateAluno={onUpdateAluno}
          onUpdateTurma={onUpdateTurma}
          onDesvincular={onDesvincular}
          onCompartilhar={onCompartilhar}
          onVincularConta={onVincularConta}
        />
      )}

      {sub === "aulas" && (
        <AlunoAulas
          proximasAulas={proximasAulas}
          historicoAulas={historicoAulas}
          tarefasAula={tarefasAula}
          onAddAula={onAddAula}
          onOpenAula={onOpenAula}
        />
      )}

      {sub === "vocabulario" && (
        <AlunoVocabulario
          vocabulario={vocabulario}
          onAdd={onAddVocabulario}
          onRemove={onRemoveVocabulario}
        />
      )}

      {sub === "pagamentos" && (
        <AlunoPagamentos
          pagamentos={pagamentos}
          onAdd={onAddPagamento}
          onMarcarPago={onMarcarPago}
          onRemove={onRemovePagamento}
        />
      )}
    </ModalShell>
  );
}

function AlunoGeral({
  aluno,
  vinculo,
  turmas,
  proximaAula,
  pendencias,
  onUpdateAluno,
  onUpdateTurma,
  onDesvincular,
  onCompartilhar,
  onVincularConta,
}: {
  aluno: Aluno;
  vinculo: AlunoProfessor | null;
  turmas: Turma[];
  proximaAula: Aula | null;
  pendencias: number;
  onUpdateAluno: (
    fields: Partial<Pick<Aluno, "contato" | "observacoes" | "email">>,
  ) => void;
  onUpdateTurma: (turmaId: string | null) => void;
  onDesvincular: () => void;
  onCompartilhar: (email: string) => Promise<string | null>;
  onVincularConta: (email: string) => Promise<VincularContaResultado>;
}) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [emailAluno, setEmailAluno] = useState(aluno.email ?? "");
  const [vinculando, setVinculando] = useState(false);
  const [msgVinculo, setMsgVinculo] = useState<string | null>(null);

  async function handleCompartilhar() {
    if (!email.trim()) return;
    setSending(true);
    setMsg(null);
    const erro = await onCompartilhar(email.trim());
    setSending(false);
    setMsg(erro ? erro : "Vínculo criado com sucesso.");
    if (!erro) setEmail("");
  }

  async function handleVincularConta() {
    if (!emailAluno.trim()) return;
    setVinculando(true);
    setMsgVinculo(null);
    const resultado = await onVincularConta(emailAluno.trim());
    setVinculando(false);
    setMsgVinculo(
      resultado.status === "vinculado"
        ? "Conta vinculada! As informações já aparecem pro aluno."
        : resultado.status === "nao_encontrado"
          ? "E-mail salvo. Essa pessoa ainda não criou a conta - o vínculo acontece sozinho assim que ela se cadastrar."
          : resultado.mensagem ?? "Não foi possível vincular.",
    );
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <div className="text-xs text-muted">Próxima aula</div>
          <div className="mt-1 text-sm text-ink">
            {proximaAula ? `${proximaAula.titulo} · ${proximaAula.data}` : "Nenhuma agendada"}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <div className="text-xs text-muted">Tarefas pendentes</div>
          <div className="mt-1 text-sm text-ink">{pendencias}</div>
        </div>
      </div>

      <label className={labelClass}>Contato</label>
      <input
        defaultValue={aluno.contato ?? ""}
        onBlur={(e) => onUpdateAluno({ contato: e.target.value.trim() || null })}
        placeholder="Telefone, WhatsApp..."
        className={`mb-3 ${inputClass}`}
      />

      <label className={labelClass}>
        E-mail do aluno
        {aluno.user_id && (
          <span className="ml-2 rounded-full border border-success px-1.5 py-0.5 text-[10px] font-normal text-success">
            conta vinculada
          </span>
        )}
      </label>
      <div className="mb-1 flex flex-wrap gap-2">
        <input
          type="email"
          value={emailAluno}
          onChange={(e) => setEmailAluno(e.target.value)}
          placeholder="e-mail que o aluno vai usar pra criar a conta"
          className={`min-w-[180px] flex-1 ${inputClass}`}
        />
        <button
          onClick={handleVincularConta}
          disabled={vinculando || !emailAluno.trim()}
          className={secondaryButtonClass}
        >
          {vinculando ? "Vinculando..." : "Vincular"}
        </button>
      </div>
      <div className="mb-3 text-xs text-muted">{msgVinculo}</div>

      <label className={labelClass}>Turma</label>
      <select
        defaultValue={vinculo?.turma_id ?? ""}
        onChange={(e) => onUpdateTurma(e.target.value || null)}
        className={`mb-3 ${inputClass}`}
      >
        <option value="">Sem turma</option>
        {turmas.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome}
          </option>
        ))}
      </select>

      <label className={labelClass}>Observações</label>
      <textarea
        defaultValue={aluno.observacoes ?? ""}
        rows={4}
        onBlur={(e) => onUpdateAluno({ observacoes: e.target.value.trim() || null })}
        placeholder="Progresso, dificuldades, preferências..."
        className={`mb-5 resize-none ${inputClass}`}
      />

      <div className="mb-5 rounded-lg border border-border bg-surface-2 p-3">
        <div className="mb-2 text-xs font-medium text-muted">
          Compartilhar este aluno com outra professora
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e-mail da outra professora"
            className={`min-w-[180px] flex-1 ${inputClass}`}
          />
          <button onClick={handleCompartilhar} disabled={sending} className={secondaryButtonClass}>
            {sending ? "Enviando..." : "Vincular"}
          </button>
        </div>
        {msg && <div className="mt-2 text-xs text-muted">{msg}</div>}
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
          <div className="text-xs text-muted">{aula.data ?? "sem data"}</div>
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

// ---------- Aulas (planejador global) ----------

function AulasTab({
  alunos,
  turmas,
  aulas,
  onAddAula,
  onOpenAula,
  onRemoveAula,
  onToggleStatus,
}: {
  alunos: Aluno[];
  turmas: Turma[];
  aulas: Aula[];
  onAddAula: (
    alunoId: string,
    turmaId: string | null,
    titulo: string,
    data: string,
  ) => Promise<void>;
  onOpenAula: (id: string) => void;
  onRemoveAula: (id: string) => Promise<void>;
  onToggleStatus: (aula: Aula) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [alunoId, setAlunoId] = useState("");
  const [turmaId, setTurmaId] = useState("");
  const [data, setData] = useState("");
  const [saving, setSaving] = useState(false);
  const [filtroAluno, setFiltroAluno] = useState<string>("all");

  async function handleAdd() {
    if (!titulo.trim() || !alunoId) return;
    setSaving(true);
    await onAddAula(alunoId, turmaId || null, titulo.trim(), data);
    setSaving(false);
    setTitulo("");
    setData("");
  }

  const alunoNome = (id: string | null) => alunos.find((a) => a.id === id)?.nome ?? "Sem aluno";

  const visiveis = aulas
    .filter((a) => filtroAluno === "all" || a.aluno_id === filtroAluno)
    .slice()
    .sort((a, b) => (a.data ?? "9999").localeCompare(b.data ?? "9999"));

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton
          active={filtroAluno === "all"}
          label="Todos os alunos"
          onClick={() => setFiltroAluno("all")}
        />
        {alunos.map((a) => (
          <TabButton
            key={a.id}
            active={filtroAluno === a.id}
            label={a.nome}
            onClick={() => setFiltroAluno(a.id)}
          />
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título da aula..."
          className={`min-w-[160px] flex-1 ${inputClass}`}
        />
        <select
          value={alunoId}
          onChange={(e) => setAlunoId(e.target.value)}
          className={inputClass}
          style={{ width: "auto" }}
        >
          <option value="">Selecione o aluno</option>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
        <select
          value={turmaId}
          onChange={(e) => setTurmaId(e.target.value)}
          className={inputClass}
          style={{ width: "auto" }}
        >
          <option value="">Sem turma</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={inputClass}
          style={{ width: "auto" }}
        />
        <button onClick={handleAdd} disabled={saving || !alunoId} className={primaryButtonClass}>
          Adicionar aula
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {visiveis.length === 0 && <div className="text-sm text-muted">Nenhuma aula por aqui.</div>}
        {visiveis.map((aula) => (
          <div
            key={aula.id}
            onClick={() => onOpenAula(aula.id)}
            className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-surface p-3 transition hover:border-brand"
          >
            <div>
              <div className="text-sm text-ink">{aula.titulo}</div>
              <div className="text-xs text-muted">
                {alunoNome(aula.aluno_id)}
                {aula.data ? ` · ${aula.data}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus(aula);
                }}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  aula.status === "dada" ? "bg-success text-brand-ink" : "bg-surface-3 text-muted"
                }`}
              >
                {aula.status === "dada" ? "Dada" : "Planejada"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveAula(aula.id);
                }}
                title="Remover"
                className="text-muted hover:text-danger"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AulaModal({
  aula,
  alunos,
  turmas,
  tarefas,
  vocabulario,
  onClose,
  onSave,
  onIniciarGravacao,
  onRefresh,
  onToggleTarefa,
  onRemoveTarefa,
}: {
  aula: Aula;
  alunos: Aluno[];
  turmas: Turma[];
  tarefas: TarefaAula[];
  vocabulario: Vocabulario[];
  onClose: () => void;
  onSave: (fields: Partial<Aula>) => Promise<void>;
  onIniciarGravacao: () => Promise<string | null>;
  onRefresh: () => Promise<void>;
  onToggleTarefa: (tarefa: TarefaAula) => void;
  onRemoveTarefa: (id: string) => void;
}) {
  const [titulo, setTitulo] = useState(aula.titulo);
  const [alunoId, setAlunoId] = useState(aula.aluno_id ?? "");
  const [turmaId, setTurmaId] = useState(aula.turma_id ?? "");
  const [data, setData] = useState(aula.data ?? "");
  const [status, setStatus] = useState<AulaStatus>(aula.status);
  const [objetivo, setObjetivo] = useState(aula.objetivo ?? "");
  const [conteudo, setConteudo] = useState(aula.conteudo ?? "");
  const [meetLink, setMeetLink] = useState(aula.meet_link ?? "");
  const [saving, setSaving] = useState(false);
  const [gravacaoLoading, setGravacaoLoading] = useState(false);
  const [gravacaoErro, setGravacaoErro] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({
      titulo: titulo.trim() || aula.titulo,
      aluno_id: alunoId || null,
      turma_id: turmaId || null,
      data: data || null,
      status,
      objetivo: objetivo.trim() || null,
      conteudo: conteudo.trim() || null,
      meet_link: meetLink.trim() || null,
    });
    setSaving(false);
    onClose();
  }

  async function handleIniciarGravacao() {
    setGravacaoLoading(true);
    setGravacaoErro(null);
    const erro = await onIniciarGravacao();
    setGravacaoLoading(false);
    if (erro) setGravacaoErro(erro);
  }

  async function handleRefresh() {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={`font-display text-[16px] font-bold ${inputClass}`}
        />
        <button onClick={onClose} title="Fechar" className="text-muted hover:text-ink">
          ✕
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <select
          value={alunoId}
          onChange={(e) => setAlunoId(e.target.value)}
          className={`flex-1 ${inputClass}`}
        >
          <option value="">Sem aluno</option>
          {alunos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
            </option>
          ))}
        </select>
        <select
          value={turmaId}
          onChange={(e) => setTurmaId(e.target.value)}
          className={inputClass}
        >
          <option value="">Sem turma</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={inputClass}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AulaStatus)}
          className={inputClass}
        >
          <option value="planejada">Planejada</option>
          <option value="dada">Dada</option>
        </select>
      </div>

      <label className={labelClass}>Objetivo da aula</label>
      <textarea
        value={objetivo}
        onChange={(e) => setObjetivo(e.target.value)}
        rows={2}
        placeholder="O que o aluno deve aprender..."
        className={`mb-3 resize-none ${inputClass}`}
      />

      <label className={labelClass}>Conteúdo / plano</label>
      <textarea
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        rows={6}
        placeholder="Atividades, materiais, anotações..."
        className={`mb-3 resize-none ${inputClass}`}
      />

      <label className={labelClass}>Link do Google Meet</label>
      <input
        value={meetLink}
        onChange={(e) => setMeetLink(e.target.value)}
        placeholder="https://meet.google.com/..."
        className={`mb-4 ${inputClass}`}
      />

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className={secondaryButtonClass}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-ink">Gravação com IA</span>
          {(aula.recall_bot_id || aula.resumo_ia) && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs text-muted transition hover:text-ink"
            >
              {refreshing ? "Atualizando..." : "↻ Atualizar"}
            </button>
          )}
        </div>

        {!aula.meet_link && (
          <p className="text-xs text-muted">
            Salve um link do Google Meet acima para poder gravar essa aula com IA.
          </p>
        )}

        {aula.meet_link && !aula.recall_bot_id && (
          <button onClick={handleIniciarGravacao} disabled={gravacaoLoading} className={primaryButtonClass}>
            {gravacaoLoading ? "Iniciando..." : "🎥 Iniciar gravação com IA"}
          </button>
        )}

        {gravacaoErro && <p className="mt-2 text-xs text-danger">{gravacaoErro}</p>}

        {aula.recall_bot_id && !aula.resumo_ia && (
          <p className="text-xs text-muted">
            Gravação iniciada. O resumo aparece aqui automaticamente quando a aula terminar
            (clique em Atualizar pra checar).
          </p>
        )}

        {aula.resumo_ia && (
          <div className="mb-3 rounded-lg border border-border bg-surface-2 p-3 text-sm text-ink">
            {aula.resumo_ia}
          </div>
        )}

        {vocabulario.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 text-xs font-medium text-muted">Vocabulário novo identificado</div>
            <div className="flex flex-wrap gap-1.5">
              {vocabulario.map((v) => (
                <span
                  key={v.id}
                  title={v.significado ?? undefined}
                  className="rounded-full border border-teal px-2 py-0.5 text-[11px] text-teal"
                >
                  {v.termo}
                </span>
              ))}
            </div>
          </div>
        )}

        {tarefas.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {tarefas.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.concluida}
                  onChange={() => onToggleTarefa(t)}
                  className="h-4 w-4"
                />
                <span className={`flex-1 text-sm ${t.concluida ? "text-muted line-through" : "text-ink"}`}>
                  {t.descricao}
                </span>
                <button onClick={() => onRemoveTarefa(t.id)} title="Remover" className="text-muted hover:text-danger">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

// ---------- Materiais ----------

const TIPO_LABEL: Record<MaterialTipo, string> = {
  vocabulario: "Vocabulário",
  exercicio: "Exercício",
};
const TIPO_COLOR: Record<MaterialTipo, string> = {
  vocabulario: "#45C4B0",
  exercicio: "#B98CE8",
};

function MateriaisTab({
  materiais,
  onAddMaterial,
  onOpenMaterial,
  onRemoveMaterial,
}: {
  materiais: Material[];
  onAddMaterial: (
    tipo: MaterialTipo,
    titulo: string,
    tema: string,
    nivel: Nivel,
  ) => Promise<void>;
  onOpenMaterial: (id: string) => void;
  onRemoveMaterial: (id: string) => Promise<void>;
}) {
  const [tipo, setTipo] = useState<MaterialTipo>("vocabulario");
  const [titulo, setTitulo] = useState("");
  const [tema, setTema] = useState("");
  const [nivel, setNivel] = useState<Nivel>(NIVEIS[0].key);
  const [saving, setSaving] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<MaterialTipo | "all">("all");

  async function handleAdd() {
    if (!titulo.trim()) return;
    setSaving(true);
    await onAddMaterial(tipo, titulo.trim(), tema, nivel);
    setSaving(false);
    setTitulo("");
    setTema("");
  }

  const visiveis = materiais.filter((m) => filtroTipo === "all" || m.tipo === filtroTipo);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton active={filtroTipo === "all"} label="Tudo" onClick={() => setFiltroTipo("all")} />
        <TabButton
          active={filtroTipo === "vocabulario"}
          label="Vocabulário"
          onClick={() => setFiltroTipo("vocabulario")}
        />
        <TabButton
          active={filtroTipo === "exercicio"}
          label="Exercícios"
          onClick={() => setFiltroTipo("exercicio")}
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as MaterialTipo)}
          className={inputClass}
          style={{ width: "auto" }}
        >
          <option value="vocabulario">Vocabulário</option>
          <option value="exercicio">Exercício</option>
        </select>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Palavra ou nome do exercício..."
          className={`min-w-[160px] flex-1 ${inputClass}`}
        />
        <input
          type="text"
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          placeholder="Tema (ex: viagens)"
          className={`min-w-[140px] ${inputClass}`}
          style={{ width: "auto" }}
        />
        <select
          value={nivel}
          onChange={(e) => setNivel(e.target.value as Nivel)}
          className={inputClass}
          style={{ width: "auto" }}
        >
          {NIVEIS.map((n) => (
            <option key={n.key} value={n.key}>
              {n.label}
            </option>
          ))}
        </select>
        <button onClick={handleAdd} disabled={saving} className={primaryButtonClass}>
          Adicionar
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.length === 0 && <div className="text-sm text-muted">Nada por aqui ainda.</div>}
        {visiveis.map((m) => (
          <div
            key={m.id}
            onClick={() => onOpenMaterial(m.id)}
            className="group relative cursor-pointer rounded-lg border border-border bg-surface-2 p-3"
            style={{ borderLeft: `3px solid ${TIPO_COLOR[m.tipo]}` }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveMaterial(m.id);
              }}
              title="Remover"
              className="absolute right-1.5 top-1.5 text-muted opacity-0 transition hover:text-danger group-hover:opacity-100"
            >
              ✕
            </button>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className="inline-block rounded px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide text-brand-ink"
                style={{ background: TIPO_COLOR[m.tipo] }}
              >
                {TIPO_LABEL[m.tipo]}
              </span>
              <NivelBadge nivel={m.nivel} />
            </div>
            <div className="text-sm text-ink">{m.titulo}</div>
            {m.tema && <div className="text-xs text-muted">{m.tema}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MaterialModal({
  material,
  onClose,
  onSave,
}: {
  material: Material;
  onClose: () => void;
  onSave: (conteudo: string) => Promise<void>;
}) {
  const [conteudo, setConteudo] = useState(material.conteudo ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(conteudo);
    setSaving(false);
    onClose();
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <span
              className="inline-block rounded px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide text-brand-ink"
              style={{ background: TIPO_COLOR[material.tipo] }}
            >
              {TIPO_LABEL[material.tipo]}
            </span>
            <NivelBadge nivel={material.nivel} />
          </div>
          <div className="font-display text-[15px] font-semibold text-ink">{material.titulo}</div>
          {material.tema && <div className="text-xs text-muted">{material.tema}</div>}
        </div>
        <button onClick={onClose} title="Fechar" className="text-muted hover:text-ink">
          ✕
        </button>
      </div>

      <label className={labelClass}>
        {material.tipo === "vocabulario" ? "Tradução, exemplo de uso..." : "Instruções, enunciado, gabarito..."}
      </label>
      <textarea
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        rows={8}
        className={`mb-4 resize-none ${inputClass}`}
      />

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className={secondaryButtonClass}>
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving} className={primaryButtonClass}>
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </ModalShell>
  );
}
