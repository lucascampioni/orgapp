"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Aluno } from "@/lib/types";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";

type EventoGoogle = {
  id: string;
  recurringEventId: string | null;
  summary: string;
  start: string | null;
  hangoutLink: string | null;
  recorrencia: string | null;
};

type Vinculo = {
  id: string;
  aluno_id: string;
  google_recurring_event_id: string;
  titulo: string | null;
};

const ERROS: Record<string, string> = {
  access_denied: "Você cancelou a conexão com o Google.",
  estado_invalido: "Sessão de conexão expirou, tenta de novo.",
  token: "Falha ao trocar o código de autorização por um token.",
  sem_token: "O Google não devolveu um token de acesso.",
  salvar: "Falha ao salvar a conexão no banco.",
};

export default function GoogleCalendarPainel({
  conectado,
  googleEmail,
  vinculos,
  alunos,
  onAulasCriadas,
}: {
  conectado: boolean;
  googleEmail: string | null;
  vinculos: Vinculo[];
  alunos: Aluno[];
  onAulasCriadas?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mostrarEventos, setMostrarEventos] = useState(false);
  const [eventos, setEventos] = useState<EventoGoogle[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const erroQuery = searchParams.get("google_erro");
  const conectadoAgora = searchParams.get("google_conectado");

  const alunoPorId = new Map(alunos.map((a) => [a.id, a]));
  const vinculoPorGoogleId = new Map(vinculos.map((v) => [v.google_recurring_event_id, v]));

  async function carregarEventos() {
    setCarregando(true);
    setMsg(null);
    const res = await fetch("/api/google/eventos");
    const body = (await res.json()) as { eventos?: EventoGoogle[]; error?: string };
    setCarregando(false);
    if (!res.ok || !body.eventos) {
      setMsg(body.error ?? "Falha ao buscar eventos");
      return;
    }
    setEventos(body.eventos);
    setMostrarEventos(true);
  }

  async function vincular(chave: string, titulo: string, alunoId: string) {
    if (!alunoId) return;
    const res = await fetch("/api/google/vincular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ googleRecurringEventId: chave, alunoId, titulo }),
    });
    if (!res.ok) {
      const body = (await res.json()) as { error?: string };
      setMsg(body.error ?? "Falha ao vincular");
      return;
    }
    // Vincular já sincroniza na hora, pra aula aparecer no calendário sem
    // precisar de um segundo clique em "Sincronizar agora".
    await sincronizar();
  }

  async function desvincular(id: string) {
    const res = await fetch(`/api/google/vincular?id=${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  async function sincronizar() {
    setSincronizando(true);
    setMsg(null);
    const res = await fetch("/api/google/sincronizar", { method: "POST" });
    const body = (await res.json()) as {
      criadas?: number;
      atualizadas?: number;
      removidas?: number;
      error?: string;
    };
    setSincronizando(false);
    if (!res.ok) {
      setMsg(body.error ?? "Falha ao sincronizar");
      return;
    }
    const partes = [
      body.criadas && body.criadas > 0 ? `${body.criadas} aula(s) nova(s) criada(s)` : null,
      body.atualizadas && body.atualizadas > 0 ? `${body.atualizadas} aula(s) atualizada(s)` : null,
      body.removidas && body.removidas > 0 ? `${body.removidas} aula(s) removida(s)` : null,
    ].filter(Boolean);
    setMsg(
      partes.length > 0
        ? `${partes.join(", ")} a partir do Google Calendar.`
        : "Tudo já estava sincronizado.",
    );
    if (
      (body.criadas && body.criadas > 0) ||
      (body.atualizadas && body.atualizadas > 0) ||
      (body.removidas && body.removidas > 0)
    ) {
      onAulasCriadas?.();
    }
    router.refresh();
  }

  async function desconectar() {
    const res = await fetch("/api/google/desconectar", { method: "POST" });
    if (res.ok) router.refresh();
  }

  // Agrupa as ocorrências por série recorrente (ou pelo próprio id, se o
  // evento não se repetir), pra não listar 10x o mesmo evento semanal.
  const series = new Map<string, EventoGoogle>();
  for (const e of eventos ?? []) {
    const chave = e.recurringEventId ?? e.id;
    if (!series.has(chave)) series.set(chave, e);
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-ink">Google Calendar</div>
        {conectado ? (
          <div className="flex items-center gap-2">
            <button onClick={sincronizar} disabled={sincronizando} className={secondaryButtonClass}>
              {sincronizando ? "Sincronizando..." : "↻ Sincronizar agora"}
            </button>
            <button onClick={desconectar} className={secondaryButtonClass}>
              Desconectar
            </button>
          </div>
        ) : (
          <a href="/api/google/connect" className={primaryButtonClass}>
            Conectar Google Calendar
          </a>
        )}
      </div>

      {conectado && (
        <div className="mb-2 text-xs text-muted">
          Conectado{googleEmail ? ` como ${googleEmail}` : ""}.
        </div>
      )}

      {erroQuery && (
        <div className="mb-2 text-xs text-danger">{ERROS[erroQuery] ?? `Erro: ${erroQuery}`}</div>
      )}
      {conectadoAgora && !erroQuery && (
        <div className="mb-2 text-xs text-success">Conta do Google conectada!</div>
      )}
      {msg && <div className="mb-2 text-xs text-muted">{msg}</div>}

      {conectado && vinculos.length > 0 && (
        <div className="mb-3">
          <div className="mb-1.5 text-xs font-medium text-muted">Eventos vinculados</div>
          <div className="flex flex-col gap-1.5">
            {vinculos.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5"
              >
                <span className="text-xs text-ink">
                  {v.titulo ?? "Evento"} → {alunoPorId.get(v.aluno_id)?.nome ?? "aluno removido"}
                </span>
                <button onClick={() => desvincular(v.id)} className="text-xs text-muted hover:text-danger">
                  Desvincular
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {conectado && !mostrarEventos && (
        <button onClick={carregarEventos} disabled={carregando} className="text-xs text-brand hover:underline">
          {carregando ? "Buscando eventos..." : "+ Vincular evento do Google a um aluno"}
        </button>
      )}

      {conectado && mostrarEventos && (
        <div>
          <div className="mb-1.5 text-xs font-medium text-muted">
            Eventos dos próximos 60 dias (agrupados por recorrência)
          </div>
          <div className="flex flex-col gap-1.5">
            {series.size === 0 && (
              <div className="text-xs text-muted">Nenhum evento encontrado na sua agenda.</div>
            )}
            {[...series.entries()].map(([chave, e]) => {
              const jaVinculado = vinculoPorGoogleId.has(chave);
              return (
                <EventoRow
                  key={chave}
                  evento={e}
                  alunos={alunos}
                  jaVinculado={jaVinculado}
                  onVincular={(alunoId) => vincular(chave, e.summary, alunoId)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function EventoRow({
  evento,
  alunos,
  jaVinculado,
  onVincular,
}: {
  evento: EventoGoogle;
  alunos: Aluno[];
  jaVinculado: boolean;
  onVincular: (alunoId: string) => void;
}) {
  const [alunoId, setAlunoId] = useState("");

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5">
      <div className="min-w-0">
        <div className="truncate text-xs text-ink">{evento.summary}</div>
        {evento.start && <div className="text-[11px] text-muted">{evento.start.slice(0, 16).replace("T", " ")}</div>}
        {evento.recorrencia && <div className="text-[11px] text-brand">{evento.recorrencia}</div>}
      </div>
      {jaVinculado ? (
        <span className="text-[11px] text-success">já vinculado</span>
      ) : (
        <div className="flex items-center gap-1.5">
          <select
            value={alunoId}
            onChange={(e) => setAlunoId(e.target.value)}
            className={`${inputClass} py-1 text-xs`}
            style={{ width: "auto" }}
          >
            <option value="">aluno...</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
          <button
            onClick={() => onVincular(alunoId)}
            disabled={!alunoId}
            className="text-xs text-brand hover:underline disabled:opacity-50"
          >
            Vincular
          </button>
        </div>
      )}
    </div>
  );
}
