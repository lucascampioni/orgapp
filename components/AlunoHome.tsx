"use client";

import Link from "next/link";
import type { Aluno, AlunoProfessor, Aula, Pagamento, TarefaAula, Vocabulario } from "@/lib/types";
import { hoje } from "@/components/ui";
import { useVinculoAtivo } from "@/lib/useVinculoAtivo";
import AlunoShell from "@/components/AlunoShell";

function saudacao() {
  const hora = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="font-display text-2xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

export default function AlunoHome({
  alunos,
  vinculos,
  aulas,
  tarefasAula,
  vocabulario,
  pagamentos,
  userEmail,
}: {
  alunos: Aluno[];
  vinculos: AlunoProfessor[];
  aulas: Aula[];
  tarefasAula: TarefaAula[];
  vocabulario: Vocabulario[];
  pagamentos: Pagamento[];
  userEmail: string;
}) {
  const [professorIdAtivo, selecionarVinculo] = useVinculoAtivo(vinculos);

  if (alunos.length === 0 || vinculos.length === 0) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-7">
        <div className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
          Nenhum vínculo encontrado ainda. Peça pra sua professora cadastrar o e-mail{" "}
          <span className="text-ink">{userEmail}</span> no seu perfil dentro do Lumina - assim
          que ela fizer isso, suas aulas aparecem aqui automaticamente.
        </div>
      </div>
    );
  }

  const aluno = alunos[0];
  const vinculo = vinculos.find((v) => v.professor_id === professorIdAtivo) ?? vinculos[0];
  const hojeStr = hoje();

  const minhasAulas = aulas.filter((a) => a.professor_id === vinculo.professor_id);
  const minhasTarefas = tarefasAula.filter((t) => minhasAulas.some((a) => a.id === t.aula_id));
  const meuVocab = vocabulario.filter((v) => v.professor_id === vinculo.professor_id);
  const meusPagamentos = pagamentos.filter((p) => p.professor_id === vinculo.professor_id);

  const proximasAulas = minhasAulas
    .filter((a) => a.status === "planejada" && a.data && a.data >= hojeStr)
    .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));
  const tarefasPendentes = minhasTarefas.filter((t) => !t.concluida);
  const proximoPagamento = meusPagamentos
    .filter((p) => !p.pago_em)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];
  const vocabRecente = meuVocab.slice(0, 6);

  return (
    <AlunoShell
      userEmail={userEmail}
      vinculos={vinculos}
      vinculoAtivoId={vinculo.professor_id}
      onSelecionarVinculo={selecionarVinculo}
    >
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">
          {saudacao()}, {aluno.nome.split(" ")[0]}!
        </h1>
        <p className="mt-1 text-sm text-muted">
          Aqui está o resumo das suas aulas{vinculo.idioma ? ` de ${vinculo.idioma}` : ""}
          {vinculo.professor_nome ? ` com a professora ${vinculo.professor_nome}` : ""}.
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Próxima aula"
          value={proximasAulas[0]?.data ? new Date(`${proximasAulas[0].data}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "-"}
        />
        <StatCard label="Tarefas pendentes" value={tarefasPendentes.length} />
        <StatCard
          label="Próximo pagamento"
          value={proximoPagamento ? `R$ ${proximoPagamento.valor.toFixed(2)}` : "-"}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-ink">Próximas aulas</h2>
            <Link href="/aulas" className="text-xs text-brand hover:underline">
              ver todas
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {proximasAulas.length === 0 && (
              <div className="text-sm text-muted">Nenhuma aula agendada.</div>
            )}
            {proximasAulas.slice(0, 3).map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="text-sm text-ink">{a.titulo}</div>
                <div className="text-xs text-muted">
                  {a.data}
                  {a.horario ? ` · ${a.horario}` : ""}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-ink">Tarefas pendentes</h2>
            <Link href="/tarefas" className="text-xs text-brand hover:underline">
              ver todas
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {tarefasPendentes.length === 0 && (
              <div className="text-sm text-muted">Nenhuma tarefa pendente. 🎉</div>
            )}
            {tarefasPendentes.slice(0, 3).map((t) => (
              <div key={t.id} className="rounded-lg border border-border bg-surface p-3 text-sm text-ink">
                {t.descricao}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-ink">Vocabulário recente</h2>
          <Link href="/vocabulario" className="text-xs text-brand hover:underline">
            ver todo
          </Link>
        </div>
        {vocabRecente.length === 0 ? (
          <div className="text-sm text-muted">
            As palavras novas que você aprender nas aulas gravadas aparecem aqui.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {vocabRecente.map((v) => (
              <span
                key={v.id}
                title={v.significado ?? undefined}
                className="rounded-full border border-teal px-3 py-1 text-xs text-teal"
              >
                {v.termo}
              </span>
            ))}
          </div>
        )}
      </section>
    </AlunoShell>
  );
}
