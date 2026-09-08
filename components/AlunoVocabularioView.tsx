"use client";

import type { AlunoProfessor, Vocabulario } from "@/lib/types";
import { useVinculoAtivo } from "@/lib/useVinculoAtivo";
import AlunoShell from "@/components/AlunoShell";

export default function AlunoVocabularioView({
  vinculos,
  vocabulario,
  userEmail,
}: {
  vinculos: AlunoProfessor[];
  vocabulario: Vocabulario[];
  userEmail: string;
}) {
  const [professorIdAtivo, selecionarVinculo] = useVinculoAtivo(vinculos);
  const vinculo = vinculos.find((v) => v.professor_id === professorIdAtivo) ?? vinculos[0];

  if (!vinculo) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-7 text-sm text-muted">
        Nenhum vínculo encontrado ainda.
      </div>
    );
  }

  const meuVocab = vocabulario.filter((v) => v.professor_id === vinculo.professor_id);

  return (
    <AlunoShell
      userEmail={userEmail}
      vinculos={vinculos}
      vinculoAtivoId={vinculo.professor_id}
      onSelecionarVinculo={selecionarVinculo}
    >
      <h1 className="mb-4 font-display text-2xl font-semibold text-ink">Vocabulário</h1>

      {meuVocab.length === 0 ? (
        <div className="text-sm text-muted">
          As palavras novas que você aprender nas aulas gravadas aparecem aqui.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {meuVocab.map((v) => (
            <div key={v.id} className="rounded-lg border border-border bg-surface p-3">
              <div className="text-sm font-medium text-ink">{v.termo}</div>
              {v.significado && <div className="text-xs text-muted">{v.significado}</div>}
              {v.exemplo && (
                <div className="mt-1 text-xs italic text-faint">&ldquo;{v.exemplo}&rdquo;</div>
              )}
            </div>
          ))}
        </div>
      )}
    </AlunoShell>
  );
}
