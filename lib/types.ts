export type Nivel = "iniciante" | "basico" | "intermediario" | "avancado";

export type NivelCefr = "a1" | "a2" | "b1" | "b2" | "c1" | "c2";

export type ObjetivoAluno =
  | "conversacao"
  | "business"
  | "viagem"
  | "entrevista"
  | "academico"
  | "certificacao"
  | "trabalho"
  | "fluencia"
  | "outro";

export type CategoriaErro =
  | "grammar"
  | "vocabulary"
  | "pronunciation"
  | "word_choice"
  | "fluency";

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
  email: string | null;
  user_id: string | null;
  observacoes: string | null;
  nivel_cefr: NivelCefr | null;
  objetivo: ObjetivoAluno | null;
  pontos_fortes: string | null;
  pontos_desenvolver: string | null;
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
  topicos: string[] | null;
  pontos_positivos: string[] | null;
  pontos_melhorar: string[] | null;
  sugestao_ia: string | null;
  criado_em: string;
}

export interface ErroAula {
  id: string;
  aula_id: string;
  aluno_id: string;
  frase_original: string;
  correcao: string | null;
  explicacao: string | null;
  categoria: CategoriaErro | null;
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
