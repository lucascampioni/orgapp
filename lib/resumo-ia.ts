import Anthropic from "@anthropic-ai/sdk";

export type ResumoIA = {
  resumo: string;
  tarefas: string[];
  vocabulario: { termo: string; significado?: string; exemplo?: string }[];
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
          "Toda palavra ou expressão em inglês que a professora traduziu, explicou o significado ou deu como exemplo durante a aula - mesmo em aulas focadas em gramática (ex: ao explicar 'to be', a professora usa e traduz 'angry' e a expressão 'I get it' - isso conta como vocabulário). Não inclua palavras comuns que o aluno já claramente dominava sem precisar de explicação. IMPORTANTE: se o campo 'resumo' menciona alguma palavra/expressão sendo trabalhada, ela tem que aparecer aqui também - os dois campos precisam ser consistentes entre si. Pode ser vazia só se nenhuma palavra foi de fato explicada.",
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
    required: [
      "resumo",
      "tarefas",
      "vocabulario",
      "topicos",
      "erros",
      "pontos_positivos",
      "pontos_melhorar",
      "sugestao",
    ],
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
        content: `Esta é a transcrição de uma aula de inglês (pode ter trechos em português, quando a professora explica algo). Gere o resumo, as tarefas de acompanhamento, o vocabulário novo ensinado, os tópicos abordados, os erros que o ALUNO cometeu ao falar inglês, os pontos positivos, os pontos a melhorar e uma sugestão pra próxima aula, usando a ferramenta disponível. Antes de responder, confira: toda palavra/expressão que você citar no resumo como tendo sido ensinada ou trabalhada também precisa estar listada no campo vocabulario - os dois campos não podem se contradizer.\n\nTranscrição:\n${transcript}`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude não retornou o resumo estruturado esperado");
  }

  return toolUse.input as ResumoIA;
}
