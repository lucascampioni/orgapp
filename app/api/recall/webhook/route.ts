import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractBotId, getTranscriptText } from "@/lib/recall";

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
    },
    required: ["resumo", "tarefas"],
  },
};

async function summarize(transcript: string) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    tools: [SUMMARY_TOOL],
    tool_choice: { type: "tool", name: SUMMARY_TOOL.name },
    messages: [
      {
        role: "user",
        content: `Esta é a transcrição de uma aula de inglês. Gere um resumo e as tarefas de acompanhamento usando a ferramenta disponível.\n\nTranscrição:\n${transcript}`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude não retornou o resumo estruturado esperado");
  }

  return toolUse.input as { resumo: string; tarefas: string[] };
}

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.RECALL_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const payload = await request.json();
  const botId = extractBotId(payload);
  if (!botId) {
    return NextResponse.json({ error: "Payload sem bot id" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: aula, error: fetchError } = await supabase
    .from("aulas")
    .select("id")
    .eq("recall_bot_id", botId)
    .single();

  if (fetchError || !aula) {
    console.error("Aula não encontrada para o bot", botId, fetchError);
    return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  }

  let transcript: string;
  try {
    transcript = await getTranscriptText(botId);
  } catch (err) {
    console.error("Falha ao buscar transcript", err);
    return NextResponse.json({ error: "Falha ao buscar transcript" }, { status: 502 });
  }

  if (!transcript.trim()) {
    return NextResponse.json({ ok: true, skipped: "transcript vazio" });
  }

  let resumo: string;
  let tarefas: string[];
  try {
    const result = await summarize(transcript);
    resumo = result.resumo;
    tarefas = result.tarefas;
  } catch (err) {
    console.error("Falha ao gerar resumo com IA", err);
    return NextResponse.json({ error: "Falha ao gerar resumo" }, { status: 502 });
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

  return NextResponse.json({ ok: true });
}
