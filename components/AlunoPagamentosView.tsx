"use client";

import type { Aluno, Pagamento } from "@/lib/types";
import { useAlunoAtivo } from "@/lib/useAlunoAtivo";
import AlunoShell from "@/components/AlunoShell";

export default function AlunoPagamentosView({
  alunos,
  pagamentos,
  userEmail,
}: {
  alunos: Aluno[];
  pagamentos: Pagamento[];
  userEmail: string;
}) {
  const [alunoAtivoId, selecionarAluno] = useAlunoAtivo(alunos);
  const aluno = alunos.find((a) => a.id === alunoAtivoId) ?? alunos[0];

  if (!aluno) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-7 text-sm text-muted">
        Nenhum vínculo encontrado ainda.
      </div>
    );
  }

  const meusPagamentos = pagamentos.filter((p) => p.aluno_id === aluno.id);
  const proximos = meusPagamentos
    .filter((p) => !p.pago_em)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const historico = meusPagamentos
    .filter((p) => p.pago_em)
    .sort((a, b) => (b.pago_em ?? "").localeCompare(a.pago_em ?? ""));

  return (
    <AlunoShell
      userEmail={userEmail}
      alunos={alunos}
      alunoAtivoId={aluno.id}
      onSelecionarAluno={selecionarAluno}
    >
      <h1 className="mb-4 font-display text-2xl font-semibold text-ink">Pagamentos</h1>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <section>
          <h2 className="mb-2 font-display text-sm font-semibold text-ink">Próximos</h2>
          <div className="flex flex-col gap-2">
            {proximos.length === 0 && <div className="text-sm text-muted">Nada pendente.</div>}
            {proximos.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="text-sm text-ink">R$ {p.valor.toFixed(2)}</div>
                <div className="text-xs text-muted">vence {p.vencimento}</div>
                {p.observacoes && <div className="mt-1 text-xs text-faint">{p.observacoes}</div>}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-display text-sm font-semibold text-ink">Histórico</h2>
          <div className="flex flex-col gap-2">
            {historico.length === 0 && (
              <div className="text-sm text-muted">Nenhum pagamento registrado ainda.</div>
            )}
            {historico.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="text-sm text-ink">R$ {p.valor.toFixed(2)}</div>
                <div className="text-xs text-success">pago em {p.pago_em}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AlunoShell>
  );
}
