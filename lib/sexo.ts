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
