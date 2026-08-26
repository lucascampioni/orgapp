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
  nome: string;
  contato: string | null;
  observacoes: string | null;
  criado_em: string;
}

export interface AlunoProfessor {
  id: string;
  aluno_id: string;
  professor_id: string;
  turma_id: string | null;
  criado_em: string;
}

export type AulaStatus = "planejada" | "dada";

export interface Aula {
  id: string;
  aluno_id: string | null;
  turma_id: string | null;
  titulo: string;
  data: string | null;
  objetivo: string | null;
  conteudo: string | null;
  status: AulaStatus;
  meet_link: string | null;
  resumo_ia: string | null;
  recall_bot_id: string | null;
  criado_em: string;
}

export interface TarefaAula {
  id: string;
  aula_id: string;
  descricao: string;
  concluida: boolean;
  criado_em: string;
}

export interface Vocabulario {
  id: string;
  aluno_id: string;
  aula_id: string | null;
  termo: string;
  significado: string | null;
  exemplo: string | null;
  criado_em: string;
}

export interface Pagamento {
  id: string;
  aluno_id: string;
  valor: number;
  vencimento: string;
  pago_em: string | null;
  observacoes: string | null;
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
