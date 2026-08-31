import type { ObjetivoAluno } from "./types";

export const OBJETIVOS: { key: ObjetivoAluno; label: string }[] = [
  { key: "conversacao", label: "Conversação" },
  { key: "business", label: "Business English" },
  { key: "viagem", label: "Viagem" },
  { key: "entrevista", label: "Entrevista" },
  { key: "academico", label: "Inglês acadêmico" },
  { key: "certificacao", label: "Provas/certificações" },
  { key: "trabalho", label: "Trabalho" },
  { key: "fluencia", label: "Fluência geral" },
  { key: "outro", label: "Outro" },
];

export const OBJETIVO_LABEL: Record<ObjetivoAluno, string> = Object.fromEntries(
  OBJETIVOS.map(({ key, label }) => [key, label]),
) as Record<ObjetivoAluno, string>;
