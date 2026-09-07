import Anthropic from "@anthropic-ai/sdk";

export type ResumoIA = {
  resumo: string;
  tarefas: string[];
  topicos: string[];
  erros: {
    frase_original: string;
    correcao?: string;
    explicacao?: string;
    categoria: "grammar" | "vocabulary" | "pronunciation" | "word_choice" | "fluency";
  }[];
  pontos_positivos: string[];
  pontos_melhorar: string[];
  sugestao: string;
};

export type VocabularioItem = { termo: string; significado?: string; exemplo?: string };

const SUMMARY_TOOL = {
  name: "salvar_resumo_aula",
  description:
    "Salva o resumo da aula e a lista de tarefas de acompanhamento identificadas na transcrição.",
  input_schema: {
    type: "object" as const,
    properties: {
      resumo: {
        type: "string",
        description:
          "Resumo objetivo do que foi trabalhado na aula, em português, 3-6 frases.",
      },
      tarefas: {
        type: "array",
        items: { type: "string" },
        description:
          "Lista curta de tarefas de acompanhamento (revisar algo, praticar algo, preparar material) que ficaram combinadas ou implícitas na aula. Pode ser vazia.",
      },
      topicos: {
        type: "array",
        items: { type: "string" },
        description:
          "3-6 tópicos/temas curtos abordados na aula (ex: 'Job Interview', 'Past Perfect', 'Travel vocabulary'). Pode ser vazia.",
      },
      erros: {
        type: "array",
        items: {
          type: "object",
          properties: {
            frase_original: {
              type: "string",
              description: "A frase exata (em inglês) que o aluno disse com o erro.",
            },
            correcao: { type: "string", description: "A versão corrigida da frase." },
            explicacao: {
              type: "string",
              description: "Explicação curta e didática do erro, em português.",
            },
            categoria: {
              type: "string",
              enum: ["grammar", "vocabulary", "pronunciation", "word_choice", "fluency"],
            },
          },
          required: ["frase_original", "categoria"],
        },
        description:
          "Erros claros que o ALUNO (não a professora) cometeu ao falar inglês durante a aula. Só inclua erros que dá pra identificar com confiança pela transcrição. Pode ser vazia.",
      },
      pontos_positivos: {
        type: "array",
        items: { type: "string" },
        description: "2-4 pontos fortes que o aluno demonstrou nessa aula. Pode ser vazia.",
      },
      pontos_melhorar: {
        type: "array",
        items: { type: "string" },
        description: "2-4 pontos que o aluno ainda precisa desenvolver. Pode ser vazia.",
      },
      sugestao: {
        type: "string",
        description:
          "Uma sugestão curta (1-2 frases) do que focar nas próximas aulas com esse aluno.",
      },
    },
    required: ["resumo", "tarefas", "topicos", "erros", "pontos_positivos", "pontos_melhorar", "sugestao"],
  },
};

export async function summarize(transcript: string): Promise<ResumoIA> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1536,
    tools: [SUMMARY_TOOL],
    tool_choice: { type: "tool", name: SUMMARY_TOOL.name },
    messages: [
      {
        role: "user",
        content: `Esta é a transcrição de uma aula de inglês (pode ter trechos em português, quando a professora explica algo). Gere o resumo, as tarefas de acompanhamento, os tópicos abordados, os erros que o ALUNO cometeu ao falar inglês, os pontos positivos, os pontos a melhorar e uma sugestão pra próxima aula, usando a ferramenta disponível.\n\nTranscrição:\n${transcript}`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude não retornou o resumo estruturado esperado");
  }

  return toolUse.input as ResumoIA;
}

const VOCABULARIO_TOOL = {
  name: "salvar_vocabulario",
  description: "Salva a lista de palavras/expressões em inglês trabalhadas na aula.",
  input_schema: {
    type: "object" as const,
    properties: {
      vocabulario: {
        type: "array",
        items: {
          type: "object",
          properties: {
            termo: { type: "string", description: "Palavra ou expressão em inglês." },
            significado: {
              type: "string",
              description: "Tradução ou explicação curta em português.",
            },
            exemplo: {
              type: "string",
              description: "Frase de exemplo usada na aula, se houver.",
            },
          },
          required: ["termo"],
        },
        description:
          "Toda palavra ou expressão em inglês que apareceu sendo traduzida, explicada ou dada como exemplo durante a aula - mesmo brevemente, mesmo numa aula focada em gramática (ex: ao explicar o verbo 'to be', a professora traduz 'angry' ou usa a expressão 'I get it' - ambos contam). Não inclua palavras comuns que o aluno claramente já dominava sem precisar de explicação nenhuma. Releia a transcrição com atenção antes de decidir que está vazia - é raro uma aula não ter nenhuma palavra nova sendo trabalhada.",
      },
    },
    required: ["vocabulario"],
  },
};

/**
 * Chamada separada só pra extrair vocabulário, em vez de um campo a mais
 * dentro de summarize() - na prática o modelo era inconsistente tentando
 * preencher 8 campos de uma vez (o resumo em texto livre mencionava
 * palavras ensinadas, mas o array estruturado vinha vazio mesmo depois de
 * reforçar a instrução). Isolar numa chamada com um único objetivo evita
 * essa disputa de atenção entre os campos.
 */
export async function extractVocabulario(transcript: string): Promise<VocabularioItem[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    tools: [VOCABULARIO_TOOL],
    tool_choice: { type: "tool", name: VOCABULARIO_TOOL.name },
    messages: [
      {
        role: "user",
        content: `Esta é a transcrição de uma aula de inglês (pode ter trechos em português, quando a professora explica algo). Liste todo vocabulário (palavra ou expressão em inglês) que foi traduzido, explicado ou exemplificado durante a aula, usando a ferramenta disponível.\n\nTranscrição:\n${transcript}`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude não retornou o vocabulário estruturado esperado");
  }

  return (toolUse.input as { vocabulario: VocabularioItem[] }).vocabulario ?? [];
}
