import Link from "next/link";
import type { ComponentType } from "react";
import {
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Plus,
  Sparkles,
  UserPlus,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import type { Aluno, AlunoProfessor, Aula, Pagamento, TarefaAula, Vocabulario } from "@/lib/types";
import { Avatar, hoje } from "@/components/ui";

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

function dataPorExtenso() {
  const texto = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function diasAtras(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
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

function inicioDoMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function mesAbreviado(iso: string) {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

function StatCard({
  icon: Icon,
  label,
  value,
  contexto,
  href,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  value: number | string;
  contexto?: string | null;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-surface p-4 transition hover:border-brand/40 hover:shadow-sm"
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</div>
      {contexto && <div className="mt-0.5 text-xs text-muted">{contexto}</div>}
    </Link>
  );
}

function DashboardCard({
  title,
  verLink,
  className = "",
  children,
}: {
  title: string;
  verLink: { href: string; label: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-surface ${className}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <Link href={verLink.href} className="text-xs font-medium text-brand hover:underline">
          {verLink.label}
        </Link>
      </div>
      {children}
    </section>
  );
}

function EmptyState({
  icon: Icon,
  titulo,
  descricao,
  acao,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  titulo: string;
  descricao: string;
  acao: { href: string; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> };
}) {
  const AcaoIcon = acao.icon;
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-faint">
        <Icon size={22} strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium text-ink">{titulo}</p>
      <p className="mt-1 max-w-[220px] text-xs text-muted">{descricao}</p>
      <Link
        href={acao.href}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-ink transition hover:bg-brand-strong"
      >
        <AcaoIcon size={14} strokeWidth={2} />
        {acao.label}
      </Link>
    </div>
  );
}

export default function DashboardHome({
  professorNome,
  alunos,
  alunoProfessor,
  aulas,
  tarefasAula,
  vocabulario,
  pagamentos,
}: {
  professorNome: string | null;
  alunos: Aluno[];
  alunoProfessor: AlunoProfessor[];
  aulas: Aula[];
  tarefasAula: TarefaAula[];
  vocabulario: Vocabulario[];
  pagamentos: Pagamento[];
}) {
  const hojeStr = hoje();
  const primeiroNome = professorNome?.trim().split(/\s+/)[0] || null;
  const textoSaudacao = primeiroNome ? `${saudacao()}, ${primeiroNome}!` : "Olá!";

  const inicioSemana = inicioDaSemana();
  const fimSemana = fimDaSemana();
  const inicioMes = inicioDoMes();

  const aulasEstaSemana = aulas.filter(
    (a) => a.data && a.data >= inicioSemana && a.data <= fimSemana,
  ).length;
  const aulasHoje = aulas.filter((a) => a.data === hojeStr).length;
  const tarefasPendentes = tarefasAula.filter((t) => !t.concluida).length;
  const alunosNovosEsteMes = alunos.filter((a) => a.criado_em >= inicioMes).length;
  const pagamentosEmAberto = pagamentos.filter((p) => !p.pago_em);
  const pagamentosVencidos = pagamentosEmAberto.filter((p) => p.vencimento < hojeStr).length;

  const alunoPorId = new Map(alunos.map((a) => [a.id, a]));
  const vinculoPorAluno = new Map(alunoProfessor.map((v) => [v.aluno_id, v]));

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

  const seteDiasAtrasStr = diasAtras(7);
  const quinzeDiasAtrasStr = diasAtras(15);

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

  for (const aluno of alunos) {
    const aulasDoAluno = aulas.filter((a) => a.aluno_id === aluno.id && a.status === "dada" && a.data);
    const semAulaRecente =
      aulasDoAluno.length === 0 || aulasDoAluno.every((a) => (a.data ?? "") < quinzeDiasAtrasStr);
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
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{textoSaudacao}</h1>
          <p className="mt-1 text-sm text-muted">{dataPorExtenso()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/alunos"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink transition hover:bg-surface-2"
          >
            <UserPlus size={16} strokeWidth={2} />
            Novo aluno
          </Link>
          <Link
            href="/calendario"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-strong"
          >
            <Plus size={16} strokeWidth={2} />
            Nova aula
          </Link>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Alunos ativos"
          value={alunos.length}
          contexto={alunosNovosEsteMes > 0 ? `+${alunosNovosEsteMes} este mês` : null}
          href="/alunos"
        />
        <StatCard
          icon={CalendarDays}
          label="Aulas esta semana"
          value={aulasEstaSemana}
          contexto={aulasHoje > 0 ? `${aulasHoje} hoje` : null}
          href="/calendario"
        />
        <StatCard
          icon={CheckSquare}
          label="Tarefas pendentes"
          value={tarefasPendentes}
          href="/tarefas"
        />
        <StatCard
          icon={Wallet}
          label="Pagamentos em aberto"
          value={pagamentosEmAberto.length}
          contexto={pagamentosVencidos > 0 ? `${pagamentosVencidos} vencido(s)` : null}
          href="/pagamentos"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <DashboardCard
          title="Próximas aulas"
          verLink={{ href: "/calendario", label: "Ver calendário" }}
          className="lg:col-span-2"
        >
          {proximasAulas.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              titulo="Nenhuma aula agendada"
              descricao="Que tal marcar a próxima aula com um aluno?"
              acao={{ href: "/calendario", label: "Agendar aula", icon: Plus }}
            />
          ) : (
            <div className="divide-y divide-border">
              {proximasAulas.map((a) => {
                const aluno = a.aluno_id ? alunoPorId.get(a.aluno_id) : null;
                const vinculo = a.aluno_id ? vinculoPorAluno.get(a.aluno_id) : null;
                const detalhe = [vinculo?.idioma, a.horario].filter(Boolean).join(" · ");
                return (
                  <Link
                    key={a.id}
                    href={aluno ? `/alunos/${aluno.id}` : "/alunos"}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2"
                  >
                    <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-surface-2 py-1.5">
                      <span className="text-[10px] font-medium text-muted">
                        {a.data ? mesAbreviado(a.data) : "-"}
                      </span>
                      <span className="text-base font-semibold leading-none text-ink">
                        {a.data ? new Date(`${a.data}T00:00:00`).getDate() : "-"}
                      </span>
                    </div>
                    {aluno && <Avatar nome={aluno.nome} size="sm" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">
                        {aluno?.nome ?? "Sem aluno"}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted">{detalhe || a.titulo}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {aluno?.nivel_cefr && (
                        <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted">
                          {aluno.nivel_cefr}
                        </span>
                      )}
                      {a.meet_link && <Video size={14} strokeWidth={2} className="text-teal" />}
                      {a.recall_bot_id && (
                        <Sparkles size={14} strokeWidth={2} className="text-violet" />
                      )}
                      <ChevronRight size={16} strokeWidth={2} className="text-faint" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Alunos recentes" verLink={{ href: "/alunos", label: "Ver todos" }}>
          {alunosRecentes.length === 0 ? (
            <EmptyState
              icon={Users}
              titulo="Nenhum aluno cadastrado"
              descricao="Cadastre o primeiro aluno pra começar a organizar as aulas."
              acao={{ href: "/alunos", label: "Cadastrar aluno", icon: UserPlus }}
            />
          ) : (
            <div className="divide-y divide-border">
              {alunosRecentes.map((aluno) => {
                const vinculo = vinculoPorAluno.get(aluno.id);
                return (
                  <Link
                    key={aluno.id}
                    href={`/alunos/${aluno.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2"
                  >
                    <Avatar nome={aluno.nome} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">{aluno.nome}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                        {vinculo?.idioma && <span className="truncate">{vinculo.idioma}</span>}
                        {aluno.nivel_cefr && (
                          <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase">
                            {aluno.nivel_cefr}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-faint" />
                  </Link>
                );
              })}
            </div>
          )}
        </DashboardCard>
      </div>

      {insights.length > 0 && (
        <section className="rounded-xl border border-brand/30 bg-brand/5 p-4">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Sparkles size={16} strokeWidth={2} className="text-brand" />
            Insights da IA
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
