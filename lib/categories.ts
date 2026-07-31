import type { Categoria, Status } from "./types";

export const CATEGORIAS: Record<Categoria, { label: string; color: string }> = {
  podbd3: { label: "PODBD3", color: "#4C6EF5" },
  bizops: { label: "BizOps", color: "#9775FA" },
  toyota: { label: "Toyota", color: "#E8590C" },
  abc: { label: "Banco ABC", color: "#12B886" },
  bv: { label: "Banco BV", color: "#F59F00" },
  inter: { label: "Interplayers", color: "#E64980" },
  protege: { label: "Protege", color: "#40C057" },
  quero: { label: "Quero", color: "#FCC419" },
};

export const CATEGORIA_KEYS = Object.keys(CATEGORIAS) as Categoria[];

export const STATUSES: { key: Status; label: string }[] = [
  { key: "afazer", label: "A Fazer" },
  { key: "fazendo", label: "Fazendo" },
  { key: "bloqueado", label: "Bloqueado" },
  { key: "feito", label: "Feito" },
];
