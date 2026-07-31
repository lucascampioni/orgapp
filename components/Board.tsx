"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIAS, CATEGORIA_KEYS, STATUSES } from "@/lib/categories";
import type { Categoria, Status, Task } from "@/lib/types";
import LogoutButton from "@/components/LogoutButton";

export default function Board({
  initialTasks,
  userEmail,
}: {
  initialTasks: Task[];
  userEmail: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeFilter, setActiveFilter] = useState<Categoria | "all">("all");
  const [newCat, setNewCat] = useState<Categoria>(CATEGORIA_KEYS[0]);
  const [newTxt, setNewTxt] = useState("");
  const [dragOverStatus, setDragOverStatus] = useState<Status | null>(null);
  const [saving, setSaving] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const visibleTasks = tasks.filter(
    (t) => activeFilter === "all" || t.categoria === activeFilter,
  );

  async function addCard() {
    const texto = newTxt.trim();
    if (!texto) return;

    setSaving(true);
    const { data, error } = await supabase
      .from("tasks")
      .insert({ categoria: newCat, texto, status: "afazer" })
      .select()
      .single();
    setSaving(false);

    if (error || !data) {
      console.error("Falha ao adicionar tarefa", error);
      return;
    }

    setTasks((prev) => [...prev, data as Task]);
    setNewTxt("");
  }

  async function removeCard(id: string) {
    const prevTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== id));

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      console.error("Falha ao remover tarefa", error);
      setTasks(prevTasks);
    }
  }

  async function moveCard(id: string, status: Status) {
    const prevTasks = tasks;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));

    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", id);
    if (error) {
      console.error("Falha ao mover tarefa", error);
      setTasks(prevTasks);
    }
  }

  async function saveDetalhes(id: string, detalhes: string) {
    const prevTasks = tasks;
    const value = detalhes.trim() || null;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, detalhes: value } : t)),
    );

    const { error } = await supabase
      .from("tasks")
      .update({ detalhes: value })
      .eq("id", id);
    if (error) {
      console.error("Falha ao salvar detalhes", error);
      setTasks(prevTasks);
    }
  }

  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-7">
      <header className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="m-0 text-xl font-bold tracking-tight text-[#E9ECEF]">
            Painel de Tarefas
          </h1>
          <div className="text-[13px] text-[#8C94A0]">
            Logado como {userEmail} · arraste os cards entre as colunas
          </div>
        </div>
        <LogoutButton />
      </header>

      <div className="my-5 flex flex-wrap items-center gap-2">
        <FilterChip
          active={activeFilter === "all"}
          label="Tudo"
          count={tasks.length}
          onClick={() => setActiveFilter("all")}
        />
        {CATEGORIA_KEYS.map((key) => (
          <FilterChip
            key={key}
            active={activeFilter === key}
            label={CATEGORIAS[key].label}
            color={CATEGORIAS[key].color}
            count={tasks.filter((t) => t.categoria === key).length}
            onClick={() => setActiveFilter(key)}
          />
        ))}

        <div className="ml-auto flex flex-wrap gap-2">
          <select
            value={newCat}
            onChange={(e) => setNewCat(e.target.value as Categoria)}
            className="rounded-lg border border-[#343A44] bg-[#22262D] px-2.5 py-2 text-[13px] text-[#E9ECEF]"
          >
            {CATEGORIA_KEYS.map((key) => (
              <option key={key} value={key}>
                {CATEGORIAS[key].label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newTxt}
            onChange={(e) => setNewTxt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCard()}
            placeholder="Nova tarefa..."
            className="min-w-[220px] rounded-lg border border-[#343A44] bg-[#22262D] px-2.5 py-2 text-[13px] text-[#E9ECEF] outline-none focus:border-[#5C9EFF]"
          />
          <button
            onClick={addCard}
            disabled={saving}
            className="rounded-lg border border-[#5C9EFF] bg-[#5C9EFF] px-2.5 py-2 text-[13px] font-semibold text-[#0E1116] transition hover:brightness-110 disabled:opacity-60"
          >
            Adicionar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATUSES.map((s) => (
          <Column
            key={s.key}
            label={s.label}
            tasks={visibleTasks.filter((t) => t.status === s.key)}
            isDragOver={dragOverStatus === s.key}
            onDragOver={() => setDragOverStatus(s.key)}
            onDragLeave={() =>
              setDragOverStatus((cur) => (cur === s.key ? null : cur))
            }
            onDrop={(id) => {
              setDragOverStatus(null);
              moveCard(id, s.key);
            }}
            onRemove={removeCard}
            onOpen={setOpenTaskId}
          />
        ))}
      </div>

      {openTask && (
        <TaskDetailsModal
          task={openTask}
          onClose={() => setOpenTaskId(null)}
          onSave={saveDetalhes}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  label,
  count,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] transition ${
        active
          ? "border-[#5C9EFF] bg-[#2A2F37] text-[#E9ECEF]"
          : "border-[#343A44] bg-[#22262D] text-[#8C94A0] hover:border-[#5C9EFF] hover:text-[#E9ECEF]"
      }`}
    >
      {color && (
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: color }}
        />
      )}
      <span>{label}</span>
      <span className="text-[11px] text-[#8C94A0]">{count}</span>
    </button>
  );
}

function Column({
  label,
  tasks,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemove,
  onOpen,
}: {
  label: string;
  tasks: Task[];
  isDragOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: (id: string) => void;
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDrop(id);
      }}
      className={`flex min-h-[200px] flex-col rounded-xl border bg-[#22262D] p-3 ${
        isDragOver
          ? "border-dashed border-[#5C9EFF]"
          : "border-[#343A44]"
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between border-b border-[#343A44] px-1 pb-3">
        <h2 className="m-0 text-[13px] font-bold uppercase tracking-wider text-[#8C94A0]">
          {label}
        </h2>
        <span className="rounded-full bg-[#2A2F37] px-2 py-0.5 text-xs text-[#8C94A0]">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {tasks.length === 0 && (
          <div className="py-4 text-center text-xs text-[#8C94A0]">—</div>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onRemove={onRemove}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onRemove,
  onOpen,
}: {
  task: Task;
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const meta = CATEGORIAS[task.categoria];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen(task.id)}
      className="group relative cursor-grab rounded-lg border border-[#343A44] bg-[#2A2F37] p-2.5 text-[13.5px] leading-snug text-[#E9ECEF] active:cursor-grabbing"
      style={{ borderLeft: `3px solid ${meta.color}` }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(task.id);
        }}
        title="Remover"
        className="absolute right-1.5 top-1.5 text-[#8C94A0] opacity-0 transition hover:text-[#FF6B6B] group-hover:opacity-100"
      >
        ✕
      </button>
      <span
        className="mb-1.5 inline-block rounded px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide text-[#0E1116]"
        style={{ background: meta.color }}
      >
        {meta.label}
      </span>
      <div>{task.texto}</div>
      {task.detalhes && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#8C94A0]">
          <span>📝</span>
          <span>Tem detalhes</span>
        </div>
      )}
    </div>
  );
}

function TaskDetailsModal({
  task,
  onClose,
  onSave,
}: {
  task: Task;
  onClose: () => void;
  onSave: (id: string, detalhes: string) => Promise<void>;
}) {
  const meta = CATEGORIAS[task.categoria];
  const [detalhes, setDetalhes] = useState(task.detalhes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(task.id, detalhes);
    setSaving(false);
    onClose();
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-[#343A44] bg-[#22262D] p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <span
              className="mb-1.5 inline-block rounded px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide text-[#0E1116]"
              style={{ background: meta.color }}
            >
              {meta.label}
            </span>
            <div className="text-[14px] text-[#E9ECEF]">{task.texto}</div>
          </div>
          <button
            onClick={onClose}
            title="Fechar"
            className="text-[#8C94A0] hover:text-[#E9ECEF]"
          >
            ✕
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-[#8C94A0]">
          Detalhes
        </label>
        <textarea
          value={detalhes}
          onChange={(e) => setDetalhes(e.target.value)}
          rows={6}
          placeholder="Anotações, contexto, links..."
          className="mb-4 w-full resize-none rounded-lg border border-[#343A44] bg-[#2A2F37] px-3 py-2 text-sm text-[#E9ECEF] outline-none focus:border-[#5C9EFF]"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-[#343A44] px-3 py-1.5 text-[13px] text-[#8C94A0] transition hover:text-[#E9ECEF]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg border border-[#5C9EFF] bg-[#5C9EFF] px-3 py-1.5 text-[13px] font-semibold text-[#0E1116] transition hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
