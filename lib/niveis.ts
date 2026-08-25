import type { Nivel } from "./types";

export const NIVEIS: { key: Nivel; label: string; color: string }[] = [
  { key: "iniciante", label: "Iniciante", color: "#4C6EF5" },
  { key: "basico", label: "Básico", color: "#12B886" },
  { key: "intermediario", label: "Intermediário", color: "#F59F00" },
  { key: "avancado", label: "Avançado", color: "#E8590C" },
];

export const NIVEL_MAP: Record<Nivel, { label: string; color: string }> =
  Object.fromEntries(NIVEIS.map(({ key, label, color }) => [key, { label, color }])) as Record<
    Nivel,
    { label: string; color: string }
  >;
