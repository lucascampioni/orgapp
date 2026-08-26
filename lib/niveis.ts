import type { Nivel } from "./types";

export const NIVEIS: { key: Nivel; label: string; color: string }[] = [
  { key: "iniciante", label: "Iniciante", color: "#7C9CF0" },
  { key: "basico", label: "Básico", color: "#45C4B0" },
  { key: "intermediario", label: "Intermediário", color: "#F2A93B" },
  { key: "avancado", label: "Avançado", color: "#FF7A7A" },
];

export const NIVEL_MAP: Record<Nivel, { label: string; color: string }> =
  Object.fromEntries(NIVEIS.map(({ key, label, color }) => [key, { label, color }])) as Record<
    Nivel,
    { label: string; color: string }
  >;
