import Link from "next/link";
import type { Aluno, AlunoProfessor, Aula, TarefaAula, Vocabulario } from "@/lib/types";
import { hoje } from "@/components/ui";

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

function inicioDaSemana() {
  const d = new Date();
  const diaSemana = d.getDay();
  d.setDate(d.getDate() - diaSemana);
  return d.toISOString().slice(0, 10);
}

function fimDaSemana() {
  const d = new Date();
  const diaSemana = d.getDay();
  d.setDate(d.getDate() + (6 - diaSemana));
  return d.toISOString().slice(0, 10);
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="font-display text-2xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

export default function DashboardHome({
  userEmail,
  alunos,
  alunoProfessor,
  aulas,
  tarefasAula,
  vocabulario,
}: {
  userEmail: string;
  alunos: Aluno[];
  alunoProfessor: AlunoProfessor[];
  aulas: Aula[];
  tarefasAula: TarefaAula[];
  vocabulario: Vocabulario[];
}) {
  const hojeStr = hoje();
  const nomeExibicao = userEmail.split("@")[0];

  const inicioSemana = inicioDaSemana();
  const fimSemana = fimDaSemana();
  const aulasEstaSemana = aulas.filter(
    (a) => a.data && a.data >= inicioSemana && a.data <= fimSemana,
  ).length;
  const aulasRealizadas = aulas.filter((a) => a.status === "dada").length;
  const tarefasPendentes = tarefasAula.filter((t) => !t.concluida).length;

  const alunoPorId = new Map(alunos.map((a) => [a.id, a]));

  const proximasAulas = aulas
    .filter((a) => a.status === "planejada" && a.data && a.data >= hojeStr)
    .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""))
    .slice(0, 5);

  const alunosRecentes = alunoProfessor
    .slice()
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
    .slice(0, 5)
    .map((v) => alunoPorId.get(v.aluno_id))
    .filter((a): a is Aluno => Boolean(a));

  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const seteDiasAtrasStr = seteDiasAtras.toISOString().slice(0, 10);

  const insights: string[] = [];

  const pendenciasPorAluno = new Map<string, number>();
  for (const t of tarefasAula) {
    if (t.concluida) continue;
    const aula = aulas.find((a) => a.id === t.aula_id);
    if (!aula?.aluno_id) continue;
    pendenciasPorAluno.set(aula.aluno_id, (pendenciasPorAluno.get(aula.aluno_id) ?? 0) + 1);
  }
  const [alunoComMaisPendencias, maisPendencias] =
    [...pendenciasPorAluno.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (alunoComMaisPendencias && maisPendencias >= 2) {
    insights.push(
      `${alunoPorId.get(alunoComMaisPendencias)?.nome ?? "Um aluno"} está com ${maisPendencias} tarefas pendentes.`,
    );
  }

  const vocabPorAluno = new Map<string, number>();
  for (const v of vocabulario) {
    if (v.criado_em < seteDiasAtrasStr) continue;
    vocabPorAluno.set(v.aluno_id, (vocabPorAluno.get(v.aluno_id) ?? 0) + 1);
  }
  const [alunoComMaisVocab, maisVocab] =
    [...vocabPorAluno.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (alunoComMaisVocab && maisVocab >= 3) {
    insights.push(
      `${alunoPorId.get(alunoComMaisVocab)?.nome ?? "Um aluno"} aprendeu ${maisVocab} palavras novas nos últimos 7 dias.`,
    );
  }

  const quinzeDiasAtras = new Date();
  quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15);
  const quinzeDiasAtrasStr = quinzeDiasAtras.toISOString().slice(0, 10);
  for (const aluno of alunos) {
    const aulasDoAluno = aulas.filter((a) => a.aluno_id === aluno.id && a.status === "dada" && a.data);
    const semAulaRecente =
      aulasDoAluno.length === 0 ||
      aulasDoAluno.every((a) => (a.data ?? "") < quinzeDiasAtrasStr);
    const temProxima = aulas.some(
      (a) => a.aluno_id === aluno.id && a.status === "planejada" && a.data && a.data >= hojeStr,
    );
    if (semAulaRecente && !temProxima && aulasDoAluno.length > 0) {
      insights.push(`${aluno.nome} não tem aula há mais de 15 dias e nada agendado.`);
      break;
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">
          {saudacao()}, {nomeExibicao}!
        </h1>
        <p className="mt-1 text-sm text-muted">Aqui está o resumo das suas atividades.</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Alunos" value={alunos.length} />
        <StatCard label="Aulas esta semana" value={aulasEstaSemana} />
        <StatCard label="Aulas realizadas" value={aulasRealizadas} />
        <StatCard label="Tarefas pendentes" value={tarefasPendentes} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 font-display text-sm font-semibold text-ink">Próximas aulas</h2>
          <div className="flex flex-col gap-2">
            {proximasAulas.length === 0 && (
              <div className="text-sm text-muted">Nenhuma aula agendada.</div>
            )}
            {proximasAulas.map((a) => {
              const aluno = a.aluno_id ? alunoPorId.get(a.aluno_id) : null;
              return (
                <Link
                  key={a.id}
                  href={aluno ? `/alunos/${aluno.id}` : "/alunos"}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 transition hover:border-brand"
                >
                  <div>
                    <div className="text-sm text-ink">{aluno?.nome ?? "Sem aluno"}</div>
                    <div className="text-xs text-muted">
                      {a.titulo}
                      {a.data ? ` · ${a.data}` : ""}
                    </div>
                  </div>
                  {aluno?.nivel_cefr && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase text-muted">
                      {aluno.nivel_cefr}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-display text-sm font-semibold text-ink">Alunos recentes</h2>
          <div className="flex flex-col gap-2">
            {alunosRecentes.length === 0 && (
              <div className="text-sm text-muted">Nenhum aluno cadastrado ainda.</div>
            )}
            {alunosRecentes.map((aluno) => (
              <Link
                key={aluno.id}
                href={`/alunos/${aluno.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 transition hover:border-brand"
              >
                <span className="text-sm text-ink">{aluno.nome}</span>
                {aluno.nivel_cefr && (
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase text-muted">
                    {aluno.nivel_cefr}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {insights.length > 0 && (
        <section className="rounded-xl border border-brand/40 bg-surface p-4">
          <h2 className="mb-2 flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
            ✨ Insights da IA
          </h2>
          <ul className="flex flex-col gap-1.5 text-sm text-muted">
            {insights.map((texto, i) => (
              <li key={i}>{texto}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
