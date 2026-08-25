export type Nivel = "iniciante" | "basico" | "intermediario" | "avancado";

export interface Turma {
  id: string;
  nome: string;
  nivel: Nivel;
  horario: string | null;
  criado_em: string;
}

export interface Aluno {
  id: string;
  turma_id: string | null;
  nome: string;
  contato: string | null;
  observacoes: string | null;
  criado_em: string;
}

export type AulaStatus = "planejada" | "dada";

export interface Aula {
  id: string;
  turma_id: string | null;
  titulo: string;
  data: string | null;
  objetivo: string | null;
  conteudo: string | null;
  status: AulaStatus;
  criado_em: string;
}

export type MaterialTipo = "vocabulario" | "exercicio";

export interface Material {
  id: string;
  tipo: MaterialTipo;
  titulo: string;
  conteudo: string | null;
  tema: string | null;
  nivel: Nivel | null;
  criado_em: string;
}
