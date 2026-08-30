"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NIVEIS } from "@/lib/niveis";
import type { Aluno, AlunoProfessor, Aula, Nivel, TarefaAula, Turma } from "@/lib/types";
import LogoutButton from "@/components/LogoutButton";
import Logo from "@/components/Logo";
import { TabButton, hoje, inputClass, primaryButtonClass } from "@/components/ui";

export default function Dashboard({
  initialTurmas,
  initialAlunos,
  initialAlunoProfessor,
  initialAulas,
  initialTarefasAula,
  userEmail,
}: {
  initialTurmas: Turma[];
  initialAlunos: Aluno[];
  initialAlunoProfessor: AlunoProfessor[];
  initialAulas: Aula[];
  initialTarefasAula: TarefaAula[];
  userEmail: string;
}) {
  const [turmas, setTurmas] = useState<Turma[]>(initialTurmas);
  const [alunos, setAlunos] = useState<Aluno[]>(initialAlunos);
  const [alunoProfessor, setAlunoProfessor] = useState<AlunoProfessor[]>(
    initialAlunoProfessor,
  );
  const [aulas] = useState<Aula[]>(initialAulas);
  const [tarefasAula] = useState<TarefaAula[]>(initialTarefasAula);

  const supabase = useMemo(() => createClient(), []);

  const vinculoPorAluno = useMemo(() => {
    const map = new Map<string, AlunoProfessor>();
    for (const v of alunoProfessor) map.set(v.aluno_id, v);
    return map;
  }, [alunoProfessor]);

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

  async function addAluno(nome: string, contato: string, turmaId: string | null) {
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

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-7">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Logo />
          <div className="mt-1 text-[13px] text-muted">Logado como {userEmail}</div>
        </div>
        <LogoutButton />
      </header>

      <AlunosTab
        alunos={alunos}
        turmas={turmas}
        vinculoPorAluno={vinculoPorAluno}
        aulas={aulas}
        tarefasAula={tarefasAula}
        onAddAluno={addAluno}
        onAddTurma={addTurma}
      />
    </div>
  );
}

function AlunosTab({
  alunos,
  turmas,
  vinculoPorAluno,
  aulas,
  tarefasAula,
  onAddAluno,
  onAddTurma,
}: {
  alunos: Aluno[];
  turmas: Turma[];
  vinculoPorAluno: Map<string, AlunoProfessor>;
  aulas: Aula[];
  tarefasAula: TarefaAula[];
  onAddAluno: (nome: string, contato: string, turmaId: string | null) => Promise<void>;
  onAddTurma: (nome: string, nivel: Nivel, horario: string) => Promise<void>;
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
            <Link
              key={aluno.id}
              href={`/alunos/${aluno.id}`}
              className="block rounded-xl border border-border bg-surface p-4 transition hover:border-brand"
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
            </Link>
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
