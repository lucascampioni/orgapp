"use client";

import { useState } from "react";
import type { AlunoProfessor, Aula } from "@/lib/types";
import { hoje, TabButton } from "@/components/ui";
import { useVinculoAtivo } from "@/lib/useVinculoAtivo";
import AlunoShell from "@/components/AlunoShell";

type Filtro = "proximas" | "historico";

export default function AlunoAulasView({
  vinculos,
  aulas,
  userEmail,
}: {
  vinculos: AlunoProfessor[];
  aulas: Aula[];
  userEmail: string;
}) {
  const [professorIdAtivo, selecionarVinculo] = useVinculoAtivo(vinculos);
  const [filtro, setFiltro] = useState<Filtro>("proximas");

  const vinculo = vinculos.find((v) => v.professor_id === professorIdAtivo) ?? vinculos[0];

  if (!vinculo) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-7 text-sm text-muted">
        Nenhum vínculo encontrado ainda.
      </div>
    );
  }

  const hojeStr = hoje();
  const minhasAulas = aulas.filter((a) => a.professor_id === vinculo.professor_id);
  const proximasAulas = minhasAulas
    .filter((a) => a.status === "planejada" && a.data && a.data >= hojeStr)
    .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));
  const historicoAulas = minhasAulas
    .filter((a) => !(a.status === "planejada" && a.data && a.data >= hojeStr))
    .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));

  const visiveis = filtro === "proximas" ? proximasAulas : historicoAulas;

  return (
    <AlunoShell
      userEmail={userEmail}
      vinculos={vinculos}
      vinculoAtivoId={vinculo.professor_id}
      onSelecionarVinculo={selecionarVinculo}
    >
      <h1 className="mb-4 font-display text-2xl font-semibold text-ink">Aulas</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton active={filtro === "proximas"} label="Próximas" onClick={() => setFiltro("proximas")} />
        <TabButton active={filtro === "historico"} label="Histórico" onClick={() => setFiltro("historico")} />
      </div>

      <div className="flex flex-col gap-3">
        {visiveis.length === 0 && (
          <div className="text-sm text-muted">
            {filtro === "proximas" ? "Nenhuma aula agendada." : "Nenhuma aula anterior ainda."}
          </div>
        )}
        {visiveis.map((a) => (
          <AulaCard key={a.id} aula={a} />
        ))}
      </div>
    </AlunoShell>
  );
}

function AulaCard({ aula }: { aula: Aula }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">{aula.titulo}</span>
        <span className="text-xs text-muted">
          {aula.data ?? "sem data"}
          {aula.horario ? ` · ${aula.horario}` : ""}
        </span>
      </div>

      {aula.meet_link && aula.status === "planejada" && (
        <a
          href={aula.meet_link}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs text-brand hover:underline"
        >
          Entrar no Google Meet →
        </a>
      )}

      {aula.resumo_ia && (
        <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3 text-sm text-ink">
          {aula.resumo_ia}
        </div>
      )}

      {aula.topicos && aula.topicos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {aula.topicos.map((topico) => (
            <span
              key={topico}
              className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted"
            >
              {topico}
            </span>
          ))}
        </div>
      )}

      {((aula.pontos_positivos && aula.pontos_positivos.length > 0) ||
        (aula.pontos_melhorar && aula.pontos_melhorar.length > 0)) && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {aula.pontos_positivos && aula.pontos_positivos.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted">Pontos positivos</div>
              <ul className="list-inside list-disc text-sm text-ink">
                {aula.pontos_positivos.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {aula.pontos_melhorar && aula.pontos_melhorar.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted">Pontos a melhorar</div>
              <ul className="list-inside list-disc text-sm text-ink">
                {aula.pontos_melhorar.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
