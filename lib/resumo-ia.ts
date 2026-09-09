import Anthropic from "@anthropic-ai/sdk";

export type ResumoIA = {
  resumo: string;
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

export type TarefaGerada = {
  descricao: string;
  tipo: "checklist" | "dissertativa" | "multipla_escolha";
  opcoes?: string[];
  resposta_correta?: string;
};

const SUMMARY_TOOL = {
  name: "salvar_resumo_aula",
  description: "Salva o resumo da aula e a análise do desempenho do aluno.",
  input_schema: {
    type: "object" as const,
    properties: {
      resumo: {
        type: "string",
        description:
          "Resumo objetivo do que foi trabalhado na aula, em português, 3-6 frases.",
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
          "Erros claros que o ALUNO (não a professora) cometeu ao falar inglês durante a aula. ATENÇÃO: a transcrição vem de reconhecimento de voz automático e às vezes transcreve errado uma palavra parecida foneticamente (ex: 'wheel' virar 'Will', que não faz sentido nenhum na frase) - antes de reportar um erro, use o contexto pra checar se a palavra estranha faz sentido; se não fizer, é provável que seja erro de transcrição, não erro do aluno, e nesse caso troque pela palavra que o aluno realmente disse (ou não inclua o erro, se não der pra ter certeza). Só inclua erros de fala reais do aluno (gramática, vocabulário, pronúncia etc.) que dá pra identificar com confiança. Pode ser vazia.",
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
    required: ["resumo", "topicos", "erros", "pontos_positivos", "pontos_melhorar", "sugestao"],
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
        content: `Esta é a transcrição de uma aula de inglês (pode ter trechos em português, quando a professora explica algo), gerada por reconhecimento de voz automático - pode ter palavras transcritas erradas por soarem parecido com a palavra certa (ex: 'wheel' virar 'Will'). Sempre que uma palavra não fizer sentido no contexto da frase, considere que pode ser erro de transcrição em vez de erro do aluno. Gere o resumo, os tópicos abordados, os erros que o ALUNO cometeu ao falar inglês, os pontos positivos, os pontos a melhorar e uma sugestão pra próxima aula, usando a ferramenta disponível.\n\nTranscrição:\n${transcript}`,
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
 * preencher vários campos de uma vez (o resumo em texto livre mencionava
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
        content: `Esta é a transcrição de uma aula de inglês (pode ter trechos em português, quando a professora explica algo), gerada por reconhecimento de voz automático - pode ter transcrito uma palavra errada por soar parecido com a certa (ex: 'wheel' virar 'Will'); se uma palavra não fizer sentido no contexto, considere a possibilidade de erro de transcrição antes de listá-la como vocabulário. Liste todo vocabulário (palavra ou expressão em inglês) que foi traduzido, explicado ou exemplificado durante a aula, usando a ferramenta disponível.\n\nTranscrição:\n${transcript}`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude não retornou o vocabulário estruturado esperado");
  }

  return (toolUse.input as { vocabulario: VocabularioItem[] }).vocabulario ?? [];
}

const TAREFAS_TOOL = {
  name: "salvar_tarefas",
  description: "Salva as tarefas de prática pro aluno fazer depois da aula.",
  input_schema: {
    type: "object" as const,
    properties: {
      tarefas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            descricao: {
              type: "string",
              description:
                "O enunciado da tarefa/pergunta, em português, específico o suficiente pro aluno conseguir responder sozinho sem precisar perguntar nada pra professora (ex: 'Escreva 3 frases usando I am / He is / She is para descrever como diferentes pessoas da sua família estão se sentindo hoje', não só 'praticar o verbo to be').",
            },
            tipo: {
              type: "string",
              enum: ["checklist", "dissertativa", "multipla_escolha"],
              description:
                "checklist = ação sem uma resposta certa pra digitar (ex: 'ouvir uma música em inglês e anotar 3 palavras novas', 'praticar a pronúncia de X em voz alta 5 vezes'); dissertativa = pergunta aberta que o aluno responde escrevendo um texto curto; multipla_escolha = pergunta objetiva com alternativas, tem uma resposta certa.",
            },
            opcoes: {
              type: "array",
              items: { type: "string" },
              description: "Só quando tipo=multipla_escolha: 3 a 4 alternativas curtas, incluindo a correta.",
            },
            resposta_correta: {
              type: "string",
              description:
                "Só quando tipo=multipla_escolha: o texto de uma das opcoes (exatamente igual) que é a resposta certa.",
            },
          },
          required: ["descricao", "tipo"],
        },
        description:
          "2-4 tarefas de prática pra reforçar o que foi trabalhado nessa aula específica. Prefira dissertativa ou multipla_escolha (uma resposta de verdade pro aluno escrever/escolher) sempre que der pra transformar o conteúdo da aula numa pergunta objetiva - só use checklist quando realmente não tem uma resposta certa pra pedir por escrito. Pode ser vazia se a aula não deu material suficiente pra tarefas específicas.",
      },
    },
    required: ["tarefas"],
  },
};

/**
 * Também numa chamada separada, pelo mesmo motivo do vocabulário - e
 * porque agora tarefa é uma estrutura mais rica (tipo, alternativas), não
 * só uma frase solta, então merece o foco total do modelo.
 */
export async function extractTarefas(transcript: string): Promise<TarefaGerada[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1536,
    tools: [TAREFAS_TOOL],
    tool_choice: { type: "tool", name: TAREFAS_TOOL.name },
    messages: [
      {
        role: "user",
        content: `Esta é a transcrição de uma aula de inglês (pode ter trechos em português, quando a professora explica algo). Baseado especificamente no que foi trabalhado nessa aula, gere tarefas de prática pro aluno fazer em casa, usando a ferramenta disponível.\n\nTranscrição:\n${transcript}`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude não retornou as tarefas estruturadas esperadas");
  }

  return (toolUse.input as { tarefas: TarefaGerada[] }).tarefas ?? [];
}
