"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Aluno, Aula, Pagamento, TarefaAula, Vocabulario } from "@/lib/types";
import LogoutButton from "@/components/LogoutButton";
import Logo from "@/components/Logo";

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export default function AlunoPortal({
  alunos,
  aulas,
  tarefasAula,
  vocabulario,
  pagamentos,
  userEmail,
}: {
  alunos: Aluno[];
  aulas: Aula[];
  tarefasAula: TarefaAula[];
  vocabulario: Vocabulario[];
  pagamentos: Pagamento[];
  userEmail: string;
}) {
  const [tarefas, setTarefas] = useState<TarefaAula[]>(tarefasAula);
  const [alunoAtivoId, setAlunoAtivoId] = useState<string | null>(alunos[0]?.id ?? null);
  const supabase = useMemo(() => createClient(), []);

  async function toggleTarefa(t: TarefaAula) {
    const prev = tarefas;
    const concluida = !t.concluida;
    setTarefas((cur) => cur.map((x) => (x.id === t.id ? { ...x, concluida } : x)));
    const { error } = await supabase
      .from("tarefas_aula")
      .update({ concluida })
      .eq("id", t.id);
    if (error) {
      console.error("Falha ao atualizar tarefa", error);
      setTarefas(prev);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] px-6 py-7">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Logo />
          <div className="mt-1 text-[13px] text-muted">Logado como {userEmail}</div>
        </div>
        <LogoutButton />
      </header>

      {alunos.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
          Nenhum vínculo encontrado ainda. Peça pra sua professora cadastrar o e-mail{" "}
          <span className="text-ink">{userEmail}</span> no seu perfil dentro do Lumina - assim
          que ela fizer isso, suas aulas aparecem aqui automaticamente.
        </div>
      ) : (
        <AlunoConteudo
          alunos={alunos}
          alunoAtivoId={alunoAtivoId ?? alunos[0].id}
          onSelecionar={setAlunoAtivoId}
          aulas={aulas}
          tarefas={tarefas}
          vocabulario={vocabulario}
          pagamentos={pagamentos}
          onToggleTarefa={toggleTarefa}
        />
      )}
    </div>
  );
}

function AlunoConteudo({
  alunos,
  alunoAtivoId,
  onSelecionar,
  aulas,
  tarefas,
  vocabulario,
  pagamentos,
  onToggleTarefa,
}: {
  alunos: Aluno[];
  alunoAtivoId: string;
  onSelecionar: (id: string) => void;
  aulas: Aula[];
  tarefas: TarefaAula[];
  vocabulario: Vocabulario[];
  pagamentos: Pagamento[];
  onToggleTarefa: (t: TarefaAula) => void;
}) {
  const hojeStr = hoje();
  const minhasAulas = aulas.filter((a) => a.aluno_id === alunoAtivoId);
  const meuVocab = vocabulario.filter((v) => v.aluno_id === alunoAtivoId);
  const meusPagamentos = pagamentos.filter((p) => p.aluno_id === alunoAtivoId);
  const minhasTarefas = tarefas.filter((t) => minhasAulas.some((a) => a.id === t.aula_id));

  const proximasAulas = minhasAulas
    .filter((a) => a.status === "planejada" && a.data && a.data >= hojeStr)
    .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));
  const historicoAulas = minhasAulas
    .filter((a) => !(a.status === "planejada" && a.data && a.data >= hojeStr))
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));

  const proximosPagamentos = meusPagamentos
    .filter((p) => !p.pago_em)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const historicoPagamentos = meusPagamentos
    .filter((p) => p.pago_em)
    .sort((a, b) => (b.pago_em ?? "").localeCompare(a.pago_em ?? ""));

  return (
    <div>
      {alunos.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {alunos.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelecionar(a.id)}
              className={`rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                a.id === alunoAtivoId
                  ? "border-brand bg-surface text-ink"
                  : "border-border bg-surface text-muted hover:border-brand hover:text-ink"
              }`}
            >
              {a.nome}
            </button>
          ))}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Secao titulo="Próximas aulas">
          {proximasAulas.length === 0 && (
            <div className="text-sm text-muted">Nenhuma aula agendada.</div>
          )}
          {proximasAulas.map((a) => (
            <div key={a.id} className="rounded-lg border border-border bg-surface-2 p-2.5">
              <div className="text-sm text-ink">{a.titulo}</div>
              <div className="text-xs text-muted">{a.data}</div>
            </div>
          ))}
        </Secao>

        <Secao titulo="Tarefas pendentes">
          {minhasTarefas.filter((t) => !t.concluida).length === 0 && (
            <div className="text-sm text-muted">Nenhuma tarefa pendente. 🎉</div>
          )}
          {minhasTarefas
            .filter((t) => !t.concluida)
            .map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 p-2.5"
              >
                <input
                  type="checkbox"
                  checked={t.concluida}
                  onChange={() => onToggleTarefa(t)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-ink">{t.descricao}</span>
              </label>
            ))}
        </Secao>
      </div>

      <Secao titulo="Vocabulário novo">
        {meuVocab.length === 0 && (
          <div className="text-sm text-muted">
            As palavras novas que você aprender nas aulas gravadas aparecem aqui.
          </div>
        )}
        <div className="flex flex-col gap-2">
          {meuVocab.map((v) => (
            <div key={v.id} className="rounded-lg border border-border bg-surface-2 p-2.5">
              <div className="text-sm font-medium text-ink">{v.termo}</div>
              {v.significado && <div className="text-xs text-muted">{v.significado}</div>}
              {v.exemplo && (
                <div className="text-xs italic text-faint">&ldquo;{v.exemplo}&rdquo;</div>
              )}
            </div>
          ))}
        </div>
      </Secao>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Secao titulo="Próximos pagamentos">
          {proximosPagamentos.length === 0 && (
            <div className="text-sm text-muted">Nada pendente.</div>
          )}
          {proximosPagamentos.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-surface-2 p-2.5">
              <div className="text-sm text-ink">R$ {p.valor.toFixed(2)}</div>
              <div className="text-xs text-muted">vence {p.vencimento}</div>
            </div>
          ))}
        </Secao>

        <Secao titulo="Histórico de pagamentos">
          {historicoPagamentos.length === 0 && (
            <div className="text-sm text-muted">Nenhum pagamento registrado ainda.</div>
          )}
          {historicoPagamentos.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-surface-2 p-2.5">
              <div className="text-sm text-ink">R$ {p.valor.toFixed(2)}</div>
              <div className="text-xs text-success">pago em {p.pago_em}</div>
            </div>
          ))}
        </Secao>
      </div>

      <Secao titulo="Histórico de aulas">
        {historicoAulas.length === 0 && (
          <div className="text-sm text-muted">Nenhuma aula anterior ainda.</div>
        )}
        <div className="flex flex-col gap-2">
          {historicoAulas.map((a) => (
            <div key={a.id} className="rounded-lg border border-border bg-surface-2 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink">{a.titulo}</span>
                <span className="text-xs text-muted">{a.data ?? "sem data"}</span>
              </div>
              {a.resumo_ia && <div className="mt-1.5 text-xs text-muted">{a.resumo_ia}</div>}
            </div>
          ))}
        </div>
      </Secao>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-2 font-display text-sm font-semibold text-ink">{titulo}</div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}
