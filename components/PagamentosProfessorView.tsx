"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Avatar,
  TabButton,
  hoje,
  inputClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui";
import type { Aluno, Pagamento } from "@/lib/types";

type Filtro = "em_aberto" | "vencidos" | "pagos" | "todos";

export default function PagamentosProfessorView({
  pagamentos: pagamentosIniciais,
  alunos,
}: {
  pagamentos: Pagamento[];
  alunos: Aluno[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>(pagamentosIniciais);
  const [filtro, setFiltro] = useState<Filtro>("em_aberto");

  const [novoAlunoId, setNovoAlunoId] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novoVencimento, setNovoVencimento] = useState("");
  const [novasObservacoes, setNovasObservacoes] = useState("");
  const [lancando, setLancando] = useState(false);

  const hojeStr = hoje();
  const inicioMes = hojeStr.slice(0, 7);
  const alunoPorId = useMemo(() => new Map(alunos.map((a) => [a.id, a])), [alunos]);
  const alunosOrdenados = useMemo(
    () => [...alunos].sort((a, b) => a.nome.localeCompare(b.nome)),
    [alunos],
  );

  async function lancarCobranca() {
    const valor = Number(novoValor.replace(",", "."));
    if (!novoAlunoId || !valor || !novoVencimento) return;
    setLancando(true);
    const { data, error } = await supabase
      .from("pagamentos")
      .insert({
        aluno_id: novoAlunoId,
        valor,
        vencimento: novoVencimento,
        observacoes: novasObservacoes.trim() || null,
      })
      .select()
      .single();
    setLancando(false);
    if (error || !data) {
      console.error("Falha ao lançar cobrança", error);
      return;
    }
    setPagamentos((prev) => [...prev, data as Pagamento]);
    setNovoAlunoId("");
    setNovoValor("");
    setNovoVencimento("");
    setNovasObservacoes("");
  }

  async function marcarPago(id: string) {
    const anterior = pagamentos;
    const pagoEm = hoje();
    setPagamentos((cur) => cur.map((p) => (p.id === id ? { ...p, pago_em: pagoEm } : p)));
    const { error } = await supabase.from("pagamentos").update({ pago_em: pagoEm }).eq("id", id);
    if (error) {
      console.error("Falha ao marcar pagamento", error);
      setPagamentos(anterior);
    }
  }

  const emAberto = pagamentos.filter((p) => !p.pago_em);
  const vencidos = emAberto.filter((p) => p.vencimento < hojeStr);
  const recebidoEsteMes = pagamentos.filter((p) => p.pago_em && p.pago_em.slice(0, 7) === inicioMes);

  const somaEmAberto = emAberto.reduce((soma, p) => soma + p.valor, 0);
  const somaVencidos = vencidos.reduce((soma, p) => soma + p.valor, 0);
  const somaRecebidoMes = recebidoEsteMes.reduce((soma, p) => soma + p.valor, 0);

  const listaFiltrada = pagamentos
    .filter((p) => {
      if (filtro === "em_aberto") return !p.pago_em;
      if (filtro === "vencidos") return !p.pago_em && p.vencimento < hojeStr;
      if (filtro === "pagos") return Boolean(p.pago_em);
      return true;
    })
    .sort((a, b) =>
      filtro === "pagos"
        ? (b.pago_em ?? "").localeCompare(a.pago_em ?? "")
        : a.vencimento.localeCompare(b.vencimento),
    );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Pagamentos</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Wallet size={18} strokeWidth={2} />
          </div>
          <div className="text-xs font-medium text-muted">Em aberto</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            R$ {somaEmAberto.toFixed(2)}
          </div>
          <div className="mt-0.5 text-xs text-muted">{emAberto.length} cobrança(s)</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <Wallet size={18} strokeWidth={2} />
          </div>
          <div className="text-xs font-medium text-muted">Vencidos</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            R$ {somaVencidos.toFixed(2)}
          </div>
          <div className="mt-0.5 text-xs text-muted">{vencidos.length} cobrança(s)</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
            <Wallet size={18} strokeWidth={2} />
          </div>
          <div className="text-xs font-medium text-muted">Recebido este mês</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            R$ {somaRecebidoMes.toFixed(2)}
          </div>
          <div className="mt-0.5 text-xs text-muted">{recebidoEsteMes.length} pagamento(s)</div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold text-ink">Lançar cobrança</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[160px] flex-1">
            <label className={labelClass}>Aluno</label>
            <select
              value={novoAlunoId}
              onChange={(e) => setNovoAlunoId(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Selecione...
              </option>
              {alunosOrdenados.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Valor</label>
            <input
              type="text"
              inputMode="decimal"
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              placeholder="Ex: 150"
              className={inputClass}
              style={{ width: "120px" }}
            />
          </div>
          <div>
            <label className={labelClass}>Vencimento</label>
            <input
              type="date"
              value={novoVencimento}
              onChange={(e) => setNovoVencimento(e.target.value)}
              className={inputClass}
              style={{ width: "auto" }}
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className={labelClass}>Observação (opcional)</label>
            <input
              type="text"
              value={novasObservacoes}
              onChange={(e) => setNovasObservacoes(e.target.value)}
              className={inputClass}
            />
          </div>
          <button onClick={lancarCobranca} disabled={lancando} className={primaryButtonClass}>
            {lancando ? "Lançando..." : "Lançar"}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton active={filtro === "em_aberto"} label="Em aberto" onClick={() => setFiltro("em_aberto")} />
        <TabButton active={filtro === "vencidos"} label="Vencidos" onClick={() => setFiltro("vencidos")} />
        <TabButton active={filtro === "pagos"} label="Pagos" onClick={() => setFiltro("pagos")} />
        <TabButton active={filtro === "todos"} label="Todos" onClick={() => setFiltro("todos")} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {listaFiltrada.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted">
            Nenhuma cobrança aqui.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {listaFiltrada.map((p) => {
              const aluno = alunoPorId.get(p.aluno_id);
              const vencido = !p.pago_em && p.vencimento < hojeStr;
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar nome={aluno?.nome ?? "?"} size="sm" />
                  <Link href={aluno ? `/alunos/${aluno.id}` : "/alunos"} className="min-w-0 flex-1 group">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-ink group-hover:underline">
                        {aluno?.nome ?? "Aluno removido"}
                      </span>
                      <ChevronRight size={14} strokeWidth={2} className="shrink-0 text-faint" />
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
                      R$ {p.valor.toFixed(2)} ·{" "}
                      {p.pago_em ? (
                        <span className="text-success">pago em {p.pago_em}</span>
                      ) : (
                        <span className={vencido ? "text-danger" : undefined}>vence {p.vencimento}</span>
                      )}
                      {p.observacoes ? ` · ${p.observacoes}` : ""}
                    </div>
                  </Link>
                  {!p.pago_em && (
                    <button onClick={() => marcarPago(p.id)} className={secondaryButtonClass}>
                      Marcar pago
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
