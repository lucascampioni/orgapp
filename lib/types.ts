export type Categoria =
  | "podbd3"
  | "bizops"
  | "toyota"
  | "abc"
  | "bv"
  | "inter"
  | "protege"
  | "quero";

export type Status = "afazer" | "fazendo" | "bloqueado" | "feito";

export interface Task {
  id: string;
  categoria: Categoria;
  texto: string;
  status: Status;
  criado_em: string;
}
