import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTranscriptIdFromBot, getTranscriptText } from "@/lib/recall";
import { summarize } from "@/lib/resumo-ia";

/**
 * Roda a extração de IA de novo pra uma aula já gravada (ex: quando o
 * resultado saiu inconsistente da primeira vez). Usa a sessão normal do
 * professor (não o client admin) - a própria RLS garante que só dá pra
 * reprocessar aula da própria conta. Substitui vocabulário e erros da aula
 * (evita duplicar se rodar mais de uma vez) e atualiza resumo/tópicos/
 * pontos/sugestão; NÃO mexe em tarefas_aula, pra não perder o estado de
 * "concluída" que o professor já tenha marcado.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { aulaId } = (await request.json()) as { aulaId?: string };
  if (!aulaId) {
    return NextResponse.json({ error: "aulaId é obrigatório" }, { status: 400 });
  }

  const { data: aula, error: fetchError } = await supabase
    .from("aulas")
    .select("id, aluno_id, professor_id, recall_bot_id")
    .eq("id", aulaId)
    .single();

  if (fetchError || !aula) {
    return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  }
  if (!aula.recall_bot_id) {
    return NextResponse.json({ error: "Essa aula não tem gravação com IA" }, { status: 400 });
  }

  let transcriptId: string | null;
  try {
    transcriptId = await getTranscriptIdFromBot(aula.recall_bot_id);
  } catch (err) {
    console.error("Falha ao buscar transcript_id do bot", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Falha ao buscar transcript: ${detail}` }, { status: 502 });
  }
  if (!transcriptId) {
    return NextResponse.json(
      { error: "Ainda não achei um transcript pronto pra essa gravação" },
      { status: 400 },
    );
  }

  let transcript: string;
  try {
    transcript = await getTranscriptText(transcriptId);
  } catch (err) {
    console.error("Falha ao buscar transcript", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Falha ao buscar transcript: ${detail}` }, { status: 502 });
  }

  if (!transcript.trim()) {
    return NextResponse.json({ error: "Transcript vazio" }, { status: 400 });
  }

  let resultado;
  try {
    resultado = await summarize(transcript);
  } catch (err) {
    console.error("Falha ao gerar resumo com IA", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Falha ao gerar resumo: ${detail}` }, { status: 502 });
  }

  const { error: updateError } = await supabase
    .from("aulas")
    .update({
      resumo_ia: resultado.resumo,
      topicos: resultado.topicos ?? [],
      pontos_positivos: resultado.pontos_positivos ?? [],
      pontos_melhorar: resultado.pontos_melhorar ?? [],
      sugestao_ia: resultado.sugestao || null,
    })
    .eq("id", aula.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (aula.aluno_id) {
    await supabase.from("vocabulario").delete().eq("aula_id", aula.id);
    const vocabulario = resultado.vocabulario ?? [];
    if (vocabulario.length > 0) {
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
        return NextResponse.json({ error: vocabError.message }, { status: 500 });
      }
    }

    await supabase.from("erros_aula").delete().eq("aula_id", aula.id);
    const erros = resultado.erros ?? [];
    if (erros.length > 0) {
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
        return NextResponse.json({ error: errosError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
