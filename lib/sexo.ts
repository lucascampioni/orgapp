import type { Sexo } from "./types";

export const SEXOS: { key: Sexo; label: string }[] = [
  { key: "feminino", label: "Feminino" },
  { key: "masculino", label: "Masculino" },
  { key: "outro", label: "Outro" },
  { key: "prefiro_nao_dizer", label: "Prefiro não dizer" },
];

export const SEXO_LABEL: Record<Sexo, string> = Object.fromEntries(
  SEXOS.map(({ key, label }) => [key, label]),
) as Record<Sexo, string>;

/** "professor"/"professora" de acordo com o gênero informado no cadastro;
 * sem gênero informado (outro, prefiro_nao_dizer ou null), usa a forma
 * neutra "professor(a)" em vez de assumir um dos dois. */
export function tratarProfessor(sexo: Sexo | null | undefined) {
  if (sexo === "masculino") return "professor";
  if (sexo === "feminino") return "professora";
  return "professor(a)";
}
