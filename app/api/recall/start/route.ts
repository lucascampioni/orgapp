import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBot } from "@/lib/recall";

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
    .select("id, meet_link")
    .eq("id", aulaId)
    .single();

  if (fetchError || !aula) {
    return NextResponse.json({ error: "Aula não encontrada" }, { status: 404 });
  }
  if (!aula.meet_link) {
    return NextResponse.json(
      { error: "Essa aula não tem um link do Meet cadastrado" },
      { status: 400 },
    );
  }

  // O Recall.ai autentica webhooks por assinatura (Standard Webhooks), não
  // por essa URL carregar segredo nenhum. O envio principal do webhook_url
  // é feito uma vez no dashboard do Recall.ai (Webhooks); mandar aqui também
  // é só um possível reforço por bot, caso a API aceite o override.
  const webhookUrl = new URL("/api/recall/webhook", request.nextUrl.origin);

  let botId: string;
  try {
    botId = await createBot(aula.meet_link, webhookUrl.toString());
  } catch (err) {
    console.error("Falha ao iniciar bot do Recall.ai", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Falha ao iniciar a gravação com o Recall.ai: ${detail}` },
      { status: 502 },
    );
  }

  const { error: updateError } = await supabase
    .from("aulas")
    .update({ recall_bot_id: botId })
    .eq("id", aulaId);

  if (updateError) {
    console.error("Falha ao salvar recall_bot_id", updateError);
    return NextResponse.json(
      { error: "Bot iniciado, mas falhou ao salvar no banco" },
      { status: 500 },
    );
  }

  return NextResponse.json({ botId });
}
