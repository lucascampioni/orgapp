import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Webhook } from "standardwebhooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractBotId, extractTranscriptId, getTranscriptText } from "@/lib/recall";

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
          "Palavras ou expressões em inglês que ficam claramente sendo ensinadas/explicadas como vocabulário novo para o aluno nessa aula (ex: a professora traduz ou explica o significado de uma palavra). Não inclua palavras comuns já dominadas, só as que foram efetivamente ensinadas. Pode ser vazia.",
      },
    },
    required: ["resumo", "tarefas", "vocabulario"],
  },
};

async function summarize(transcript: string) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1536,
    tools: [SUMMARY_TOOL],
    tool_choice: { type: "tool", name: SUMMARY_TOOL.name },
    messages: [
      {
        role: "user",
        content: `Esta é a transcrição de uma aula de inglês (pode ter trechos em português, quando a professora explica algo). Gere o resumo, as tarefas de acompanhamento e o vocabulário novo ensinado usando a ferramenta disponível.\n\nTranscrição:\n${transcript}`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude não retornou o resumo estruturado esperado");
  }

  return toolUse.input as {
    resumo: string;
    tarefas: string[];
    vocabulario: { termo: string; significado?: string; exemplo?: string }[];
  };
}

export async function POST(request: NextRequest) {
  try {
    return await handlePost(request);
  } catch (err) {
    // Rede de segurança: sem isso, uma exceção não tratada vira um 500 com
    // corpo vazio (o Recall.ai não mostra nada útil no Message Log).
    console.error("Erro não tratado no webhook do Recall.ai", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Erro interno: ${detail}` }, { status: 500 });
  }
}

async function handlePost(request: NextRequest) {
  // O Recall.ai assina os webhooks no padrão Standard Webhooks/Svix (o
  // "Verification Secret" no formato whsec_... do dashboard deles). O corpo
  // precisa ser lido como texto puro para a assinatura bater.
  const rawBody = await request.text();

  let payload: unknown;
  try {
    const wh = new Webhook(process.env.RECALL_WEBHOOK_SECRET!);
    payload = wh.verify(rawBody, {
      "webhook-id": request.headers.get("webhook-id") ?? "",
      "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": request.headers.get("webhook-signature") ?? "",
    });
  } catch (err) {
    console.error("Assinatura de webhook do Recall.ai inválida", err);
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const botId = extractBotId(payload);
  if (!botId) {
    return NextResponse.json({ error: "Payload sem bot id" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: aula, error: fetchError } = await supabase
    .from("aulas")
    .select("id, aluno_id, professor_id")
    .eq("recall_bot_id", botId)
    .single();

  if (fetchError || !aula) {
    console.error("Aula não encontrada para o bot", botId, fetchError);
    return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  }

  // Só o evento transcript.done carrega o id da transcrição pronta - os
  // outros eventos do bot (bot.done, recording.done etc.) chegam antes dela
  // existir, então não tem o que buscar ainda.
  const transcriptId = extractTranscriptId(payload);
  if (!transcriptId) {
    return NextResponse.json({ ok: true, skipped: "evento sem transcript pronto" });
  }

  let transcript: string;
  try {
    transcript = await getTranscriptText(transcriptId);
  } catch (err) {
    console.error("Falha ao buscar transcript", err);
    return NextResponse.json({ error: "Falha ao buscar transcript" }, { status: 502 });
  }

  if (!transcript.trim()) {
    return NextResponse.json({ ok: true, skipped: "transcript vazio" });
  }

  let resumo: string;
  let tarefas: string[];
  let vocabulario: { termo: string; significado?: string; exemplo?: string }[];
  try {
    const result = await summarize(transcript);
    resumo = result.resumo;
    tarefas = result.tarefas;
    vocabulario = result.vocabulario ?? [];
  } catch (err) {
    console.error("Falha ao gerar resumo com IA", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Falha ao gerar resumo: ${detail}` }, { status: 502 });
  }

  const { error: updateError } = await supabase
    .from("aulas")
    .update({ resumo_ia: resumo })
    .eq("id", aula.id);

  if (updateError) {
    console.error("Falha ao salvar resumo_ia", updateError);
  }

  if (tarefas.length > 0) {
    const { error: insertError } = await supabase.from("tarefas_aula").insert(
      tarefas.map((descricao) => ({ aula_id: aula.id, descricao })),
    );
    if (insertError) {
      console.error("Falha ao salvar tarefas_aula", insertError);
    }
  }

  // Só dá pra registrar vocabulário se a aula estiver ligada a um aluno
  // (aulas antigas, de antes dessa coluna existir, podem não ter).
  if (vocabulario.length > 0 && aula.aluno_id) {
    const { error: vocabError } = await supabase.from("vocabulario").insert(
      vocabulario.map((v) => ({
        aluno_id: aula.aluno_id,
        aula_id: aula.id,
        professor_id: aula.professor_id,
        termo: v.termo,
        significado: v.significado ?? null,
        exemplo: v.exemplo ?? null,
      })),
    );
    if (vocabError) {
      console.error("Falha ao salvar vocabulario", vocabError);
    }
  }

  return NextResponse.json({ ok: true });
}
