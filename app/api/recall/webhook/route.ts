import { NextResponse, type NextRequest } from "next/server";
import { Webhook } from "standardwebhooks";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractBotId, extractTranscriptId, getTranscriptText } from "@/lib/recall";
import { summarize, extractVocabulario, extractTarefas, type TarefaGerada } from "@/lib/resumo-ia";

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
  let tarefas: TarefaGerada[];
  let vocabulario: { termo: string; significado?: string; exemplo?: string }[];
  let topicos: string[];
  let erros: {
    frase_original: string;
    correcao?: string;
    explicacao?: string;
    categoria: "grammar" | "vocabulary" | "pronunciation" | "word_choice" | "fluency";
  }[];
  let pontosPositivos: string[];
  let pontosMelhorar: string[];
  let sugestao: string;
  try {
    const [result, vocab, tarefasGeradas] = await Promise.all([
      summarize(transcript),
      extractVocabulario(transcript),
      extractTarefas(transcript),
    ]);
    resumo = result.resumo;
    tarefas = tarefasGeradas;
    vocabulario = vocab;
    topicos = result.topicos ?? [];
    erros = result.erros ?? [];
    pontosPositivos = result.pontos_positivos ?? [];
    pontosMelhorar = result.pontos_melhorar ?? [];
    sugestao = result.sugestao ?? "";
  } catch (err) {
    console.error("Falha ao gerar resumo com IA", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Falha ao gerar resumo: ${detail}` }, { status: 502 });
  }

  const { error: updateError } = await supabase
    .from("aulas")
    .update({
      resumo_ia: resumo,
      topicos,
      pontos_positivos: pontosPositivos,
      pontos_melhorar: pontosMelhorar,
      sugestao_ia: sugestao || null,
    })
    .eq("id", aula.id);

  if (updateError) {
    console.error("Falha ao salvar resumo_ia", updateError);
  }

  if (tarefas.length > 0) {
    const { error: insertError } = await supabase.from("tarefas_aula").insert(
      tarefas.map((t) => ({
        aula_id: aula.id,
        descricao: t.descricao,
        tipo: t.tipo,
        opcoes: t.tipo === "multipla_escolha" ? t.opcoes ?? null : null,
        resposta_correta: t.tipo === "multipla_escolha" ? t.resposta_correta ?? null : null,
      })),
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

  if (erros.length > 0 && aula.aluno_id) {
    const { error: errosError } = await supabase.from("erros_aula").insert(
      erros.map((e) => ({
        aluno_id: aula.aluno_id,
        aula_id: aula.id,
        professor_id: aula.professor_id,
        frase_original: e.frase_original,
        correcao: e.correcao ?? null,
        explicacao: e.explicacao ?? null,
        categoria: e.categoria,
      })),
    );
    if (errosError) {
      console.error("Falha ao salvar erros_aula", errosError);
    }
  }

  return NextResponse.json({ ok: true });
}
