import type { NivelCefr } from "./types";

export const NIVEIS_CEFR: { key: NivelCefr; label: string }[] = [
  { key: "a1", label: "A1 · Iniciante" },
  { key: "a2", label: "A2 · Básico" },
  { key: "b1", label: "B1 · Intermediário" },
  { key: "b2", label: "B2 · Intermediário superior" },
  { key: "c1", label: "C1 · Avançado" },
  { key: "c2", label: "C2 · Fluente" },
];

export const CEFR_LABEL: Record<NivelCefr, string> = Object.fromEntries(
  NIVEIS_CEFR.map(({ key, label }) => [key, label]),
) as Record<NivelCefr, string>;
