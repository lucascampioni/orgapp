"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NIVEIS, NIVEL_MAP } from "@/lib/niveis";
import type {
  Aluno,
  Aula,
  AulaStatus,
  Material,
  MaterialTipo,
  Nivel,
  Turma,
} from "@/lib/types";
import LogoutButton from "@/components/LogoutButton";

type Tab = "turmas" | "aulas" | "materiais";

export default function Dashboard({
  initialTurmas,
  initialAlunos,
  initialAulas,
  initialMateriais,
  userEmail,
}: {
  initialTurmas: Turma[];
  initialAlunos: Aluno[];
  initialAulas: Aula[];
  initialMateriais: Material[];
  userEmail: string;
}) {
  const [tab, setTab] = useState<Tab>("turmas");
  const [turmas, setTurmas] = useState<Turma[]>(initialTurmas);
  const [alunos, setAlunos] = useState<Aluno[]>(initialAlunos);
  const [aulas, setAulas] = useState<Aula[]>(initialAulas);
  const [materiais, setMateriais] = useState<Material[]>(initialMateriais);
  const [openTurmaId, setOpenTurmaId] = useState<string | null>(null);
  const [openAulaId, setOpenAulaId] = useState<string | null>(null);
  const [openMaterialId, setOpenMaterialId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

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

  async function removeTurma(id: string) {
    const prevTurmas = turmas;
    const prevAlunos = alunos;
    const prevAulas = aulas;
    setTurmas((prev) => prev.filter((t) => t.id !== id));
    setAlunos((prev) =>
      prev.map((a) => (a.turma_id === id ? { ...a, turma_id: null } : a)),
    );
    setAulas((prev) => prev.filter((a) => a.turma_id !== id));

    const { error } = await supabase.from("turmas").delete().eq("id", id);
    if (error) {
      console.error("Falha ao remover turma", error);
      setTurmas(prevTurmas);
      setAlunos(prevAlunos);
      setAulas(prevAulas);
    }
  }

  async function addAluno(
    turmaId: string,
    nome: string,
    contato: string,
  ) {
    const { data, error } = await supabase
      .from("alunos")
      .insert({
        turma_id: turmaId,
        nome,
        contato: contato.trim() || null,
      })
      .select()
      .single();
    if (error || !data) {
      console.error("Falha ao adicionar aluno", error);
      return;
    }
    setAlunos((prev) => [...prev, data as Aluno]);
  }

  async function updateAluno(
    id: string,
    fields: Partial<Pick<Aluno, "contato" | "observacoes">>,
  ) {
    const prevAlunos = alunos;
    setAlunos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...fields } : a)),
    );
    const { error } = await supabase
      .from("alunos")
      .update(fields)
      .eq("id", id);
    if (error) {
      console.error("Falha ao atualizar aluno", error);
      setAlunos(prevAlunos);
    }
  }

  async function removeAluno(id: string) {
    const prevAlunos = alunos;
    setAlunos((prev) => prev.filter((a) => a.id !== id));
    const { error } = await supabase.from("alunos").delete().eq("id", id);
    if (error) {
      console.error("Falha ao remover aluno", error);
      setAlunos(prevAlunos);
    }
  }

  async function addAula(
    turmaId: string | null,
    titulo: string,
    data: string,
  ) {
    const { data: row, error } = await supabase
      .from("aulas")
      .insert({
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
    setAulas((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...fields } : a)),
    );
    const { error } = await supabase
      .from("aulas")
      .update(fields)
      .eq("id", id);
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
    setMateriais((prev) =>
      prev.map((m) => (m.id === id ? { ...m, conteudo: value } : m)),
    );
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

  const openTurma = turmas.find((t) => t.id === openTurmaId) ?? null;
  const openAula = aulas.find((a) => a.id === openAulaId) ?? null;
  const openMaterial = materiais.find((m) => m.id === openMaterialId) ?? null;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-7">
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="m-0 text-xl font-bold tracking-tight text-[#E9ECEF]">
            Painel da Professora
          </h1>
          <div className="text-[13px] text-[#8C94A0]">
            Logado como {userEmail}
          </div>
        </div>
        <LogoutButton />
      </header>

      <div className="mb-6 flex gap-2">
        <TabButton
          active={tab === "turmas"}
          label="Turmas e Alunos"
          onClick={() => setTab("turmas")}
        />
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

      {tab === "turmas" && (
        <TurmasTab
          turmas={turmas}
          alunos={alunos}
          onAddTurma={addTurma}
          onOpenTurma={setOpenTurmaId}
        />
      )}

      {tab === "aulas" && (
        <AulasTab
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

      {openTurma && (
        <TurmaModal
          turma={openTurma}
          alunos={alunos.filter((a) => a.turma_id === openTurma.id)}
          onClose={() => setOpenTurmaId(null)}
          onAddAluno={addAluno}
          onUpdateAluno={updateAluno}
          onRemoveAluno={removeAluno}
          onRemoveTurma={() => {
            removeTurma(openTurma.id);
            setOpenTurmaId(null);
          }}
        />
      )}

      {openAula && (
        <AulaModal
          aula={openAula}
          turmas={turmas}
          onClose={() => setOpenAulaId(null)}
          onSave={(fields) => updateAula(openAula.id, fields)}
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
          ? "border-[#5C9EFF] bg-[#2A2F37] text-[#E9ECEF]"
          : "border-[#343A44] bg-[#22262D] text-[#8C94A0] hover:border-[#5C9EFF] hover:text-[#E9ECEF]"
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
      className="inline-block rounded px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide text-[#0E1116]"
      style={{ background: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function ModalShell({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#343A44] bg-[#22262D] p-5"
      >
        {children}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#343A44] bg-[#2A2F37] px-3 py-2 text-sm text-[#E9ECEF] outline-none focus:border-[#5C9EFF]";
const labelClass = "mb-1 block text-xs font-medium text-[#8C94A0]";
const primaryButtonClass =
  "rounded-lg border border-[#5C9EFF] bg-[#5C9EFF] px-3 py-1.5 text-[13px] font-semibold text-[#0E1116] transition hover:brightness-110 disabled:opacity-60";
const secondaryButtonClass =
  "rounded-lg border border-[#343A44] px-3 py-1.5 text-[13px] text-[#8C94A0] transition hover:text-[#E9ECEF]";

// ---------- Turmas ----------

function TurmasTab({
  turmas,
  alunos,
  onAddTurma,
  onOpenTurma,
}: {
  turmas: Turma[];
  alunos: Aluno[];
  onAddTurma: (nome: string, nivel: Nivel, horario: string) => Promise<void>;
  onOpenTurma: (id: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [nivel, setNivel] = useState<Nivel>(NIVEIS[0].key);
  const [horario, setHorario] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!nome.trim()) return;
    setSaving(true);
    await onAddTurma(nome.trim(), nivel, horario);
    setSaving(false);
    setNome("");
    setHorario("");
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-[#343A44] bg-[#22262D] p-3">
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da turma..."
          className={`min-w-[180px] flex-1 ${inputClass}`}
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
          className={`min-w-[180px] ${inputClass}`}
          style={{ width: "auto" }}
        />
        <button onClick={handleAdd} disabled={saving} className={primaryButtonClass}>
          Adicionar turma
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {turmas.length === 0 && (
          <div className="text-sm text-[#8C94A0]">
            Nenhuma turma ainda. Adicione a primeira acima.
          </div>
        )}
        {turmas.map((turma) => {
          const count = alunos.filter((a) => a.turma_id === turma.id).length;
          return (
            <div
              key={turma.id}
              onClick={() => onOpenTurma(turma.id)}
              className="cursor-pointer rounded-xl border border-[#343A44] bg-[#22262D] p-4 transition hover:border-[#5C9EFF]"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[15px] font-semibold text-[#E9ECEF]">
                  {turma.nome}
                </span>
                <NivelBadge nivel={turma.nivel} />
              </div>
              {turma.horario && (
                <div className="mb-1 text-[13px] text-[#8C94A0]">
                  {turma.horario}
                </div>
              )}
              <div className="text-[13px] text-[#8C94A0]">
                {count} {count === 1 ? "aluno" : "alunos"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TurmaModal({
  turma,
  alunos,
  onClose,
  onAddAluno,
  onUpdateAluno,
  onRemoveAluno,
  onRemoveTurma,
}: {
  turma: Turma;
  alunos: Aluno[];
  onClose: () => void;
  onAddAluno: (turmaId: string, nome: string, contato: string) => Promise<void>;
  onUpdateAluno: (
    id: string,
    fields: Partial<Pick<Aluno, "contato" | "observacoes">>,
  ) => Promise<void>;
  onRemoveAluno: (id: string) => Promise<void>;
  onRemoveTurma: () => void;
}) {
  const [nome, setNome] = useState("");
  const [contato, setContato] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleAdd() {
    if (!nome.trim()) return;
    setSaving(true);
    await onAddAluno(turma.id, nome.trim(), contato);
    setSaving(false);
    setNome("");
    setContato("");
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[16px] font-bold text-[#E9ECEF]">
              {turma.nome}
            </span>
            <NivelBadge nivel={turma.nivel} />
          </div>
          {turma.horario && (
            <div className="text-[13px] text-[#8C94A0]">{turma.horario}</div>
          )}
        </div>
        <button onClick={onClose} title="Fechar" className="text-[#8C94A0] hover:text-[#E9ECEF]">
          ✕
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do aluno..."
          className={`min-w-[140px] flex-1 ${inputClass}`}
        />
        <input
          type="text"
          value={contato}
          onChange={(e) => setContato(e.target.value)}
          placeholder="Contato (opcional)"
          className={`min-w-[140px] flex-1 ${inputClass}`}
        />
        <button onClick={handleAdd} disabled={saving} className={primaryButtonClass}>
          Adicionar aluno
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {alunos.length === 0 && (
          <div className="py-2 text-sm text-[#8C94A0]">
            Nenhum aluno nessa turma ainda.
          </div>
        )}
        {alunos.map((aluno) => (
          <div
            key={aluno.id}
            className="rounded-lg border border-[#343A44] bg-[#2A2F37] p-2.5"
          >
            <div
              onClick={() =>
                setExpandedId((cur) => (cur === aluno.id ? null : aluno.id))
              }
              className="flex cursor-pointer items-center justify-between"
            >
              <div>
                <div className="text-sm text-[#E9ECEF]">{aluno.nome}</div>
                {aluno.contato && (
                  <div className="text-xs text-[#8C94A0]">{aluno.contato}</div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveAluno(aluno.id);
                }}
                title="Remover aluno"
                className="text-[#8C94A0] hover:text-[#FF6B6B]"
              >
                ✕
              </button>
            </div>
            {expandedId === aluno.id && (
              <div className="mt-2 border-t border-[#343A44] pt-2">
                <label className={labelClass}>Observações</label>
                <textarea
                  defaultValue={aluno.observacoes ?? ""}
                  rows={3}
                  onBlur={(e) =>
                    onUpdateAluno(aluno.id, { observacoes: e.target.value.trim() || null })
                  }
                  placeholder="Progresso, dificuldades, preferências..."
                  className={`resize-none ${inputClass}`}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-[#343A44] pt-4">
        <button
          onClick={onRemoveTurma}
          className="text-[13px] text-[#8C94A0] transition hover:text-[#FF6B6B]"
        >
          Excluir turma
        </button>
      </div>
    </ModalShell>
  );
}

// ---------- Aulas ----------

function AulasTab({
  turmas,
  aulas,
  onAddAula,
  onOpenAula,
  onRemoveAula,
  onToggleStatus,
}: {
  turmas: Turma[];
  aulas: Aula[];
  onAddAula: (
    turmaId: string | null,
    titulo: string,
    data: string,
  ) => Promise<void>;
  onOpenAula: (id: string) => void;
  onRemoveAula: (id: string) => Promise<void>;
  onToggleStatus: (aula: Aula) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [turmaId, setTurmaId] = useState<string>("");
  const [data, setData] = useState("");
  const [saving, setSaving] = useState(false);
  const [filtroTurma, setFiltroTurma] = useState<string>("all");

  async function handleAdd() {
    if (!titulo.trim()) return;
    setSaving(true);
    await onAddAula(turmaId || null, titulo.trim(), data);
    setSaving(false);
    setTitulo("");
    setData("");
  }

  const turmaNome = (id: string | null) =>
    turmas.find((t) => t.id === id)?.nome ?? "Sem turma";

  const visiveis = aulas
    .filter((a) => filtroTurma === "all" || a.turma_id === filtroTurma)
    .slice()
    .sort((a, b) => (a.data ?? "9999").localeCompare(b.data ?? "9999"));

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton
          active={filtroTurma === "all"}
          label="Todas as turmas"
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
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-[#343A44] bg-[#22262D] p-3">
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título da aula..."
          className={`min-w-[180px] flex-1 ${inputClass}`}
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
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className={inputClass}
          style={{ width: "auto" }}
        />
        <button onClick={handleAdd} disabled={saving} className={primaryButtonClass}>
          Adicionar aula
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {visiveis.length === 0 && (
          <div className="text-sm text-[#8C94A0]">Nenhuma aula por aqui.</div>
        )}
        {visiveis.map((aula) => (
          <div
            key={aula.id}
            onClick={() => onOpenAula(aula.id)}
            className="flex cursor-pointer items-center justify-between rounded-lg border border-[#343A44] bg-[#22262D] p-3 transition hover:border-[#5C9EFF]"
          >
            <div>
              <div className="text-sm text-[#E9ECEF]">{aula.titulo}</div>
              <div className="text-xs text-[#8C94A0]">
                {turmaNome(aula.turma_id)}
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
                  aula.status === "dada"
                    ? "bg-[#12B886] text-[#0E1116]"
                    : "bg-[#2A2F37] text-[#8C94A0]"
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
                className="text-[#8C94A0] hover:text-[#FF6B6B]"
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
  turmas,
  onClose,
  onSave,
}: {
  aula: Aula;
  turmas: Turma[];
  onClose: () => void;
  onSave: (fields: Partial<Aula>) => Promise<void>;
}) {
  const [titulo, setTitulo] = useState(aula.titulo);
  const [turmaId, setTurmaId] = useState(aula.turma_id ?? "");
  const [data, setData] = useState(aula.data ?? "");
  const [status, setStatus] = useState<AulaStatus>(aula.status);
  const [objetivo, setObjetivo] = useState(aula.objetivo ?? "");
  const [conteudo, setConteudo] = useState(aula.conteudo ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({
      titulo: titulo.trim() || aula.titulo,
      turma_id: turmaId || null,
      data: data || null,
      status,
      objetivo: objetivo.trim() || null,
      conteudo: conteudo.trim() || null,
    });
    setSaving(false);
    onClose();
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={`text-[16px] font-bold ${inputClass}`}
        />
        <button onClick={onClose} title="Fechar" className="text-[#8C94A0] hover:text-[#E9ECEF]">
          ✕
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <select
          value={turmaId}
          onChange={(e) => setTurmaId(e.target.value)}
          className={`flex-1 ${inputClass}`}
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
        placeholder="O que os alunos devem aprender..."
        className={`mb-3 resize-none ${inputClass}`}
      />

      <label className={labelClass}>Conteúdo / plano</label>
      <textarea
        value={conteudo}
        onChange={(e) => setConteudo(e.target.value)}
        rows={6}
        placeholder="Atividades, materiais, anotações..."
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

// ---------- Materiais ----------

const TIPO_LABEL: Record<MaterialTipo, string> = {
  vocabulario: "Vocabulário",
  exercicio: "Exercício",
};
const TIPO_COLOR: Record<MaterialTipo, string> = {
  vocabulario: "#4C6EF5",
  exercicio: "#9775FA",
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

  const visiveis = materiais.filter(
    (m) => filtroTipo === "all" || m.tipo === filtroTipo,
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton
          active={filtroTipo === "all"}
          label="Tudo"
          onClick={() => setFiltroTipo("all")}
        />
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

      <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-[#343A44] bg-[#22262D] p-3">
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
          className={`min-w-[180px] flex-1 ${inputClass}`}
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
        {visiveis.length === 0 && (
          <div className="text-sm text-[#8C94A0]">Nada por aqui ainda.</div>
        )}
        {visiveis.map((m) => (
          <div
            key={m.id}
            onClick={() => onOpenMaterial(m.id)}
            className="group relative cursor-pointer rounded-lg border border-[#343A44] bg-[#2A2F37] p-3"
            style={{ borderLeft: `3px solid ${TIPO_COLOR[m.tipo]}` }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveMaterial(m.id);
              }}
              title="Remover"
              className="absolute right-1.5 top-1.5 text-[#8C94A0] opacity-0 transition hover:text-[#FF6B6B] group-hover:opacity-100"
            >
              ✕
            </button>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className="inline-block rounded px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide text-[#0E1116]"
                style={{ background: TIPO_COLOR[m.tipo] }}
              >
                {TIPO_LABEL[m.tipo]}
              </span>
              <NivelBadge nivel={m.nivel} />
            </div>
            <div className="text-sm text-[#E9ECEF]">{m.titulo}</div>
            {m.tema && (
              <div className="text-xs text-[#8C94A0]">{m.tema}</div>
            )}
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
              className="inline-block rounded px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide text-[#0E1116]"
              style={{ background: TIPO_COLOR[material.tipo] }}
            >
              {TIPO_LABEL[material.tipo]}
            </span>
            <NivelBadge nivel={material.nivel} />
          </div>
          <div className="text-[15px] font-semibold text-[#E9ECEF]">
            {material.titulo}
          </div>
          {material.tema && (
            <div className="text-xs text-[#8C94A0]">{material.tema}</div>
          )}
        </div>
        <button onClick={onClose} title="Fechar" className="text-[#8C94A0] hover:text-[#E9ECEF]">
          ✕
        </button>
      </div>

      <label className={labelClass}>
        {material.tipo === "vocabulario"
          ? "Tradução, exemplo de uso..."
          : "Instruções, enunciado, gabarito..."}
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
