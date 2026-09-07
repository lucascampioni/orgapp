import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { agendarBotSeNecessario } from "@/lib/recall-agendamento";

/**
 * Chamado depois de salvar uma aula (não pelo professor diretamente) pra
 * agendar o bot automaticamente quando a aula já tem link do Meet, data e
 * horário. Não faz nada (devolve botId null) se não for o caso - ver
 * agendarBotSeNecessario pras condições.
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

  const webhookUrl = new URL("/api/recall/webhook", request.nextUrl.origin).toString();
  const botId = await agendarBotSeNecessario(supabase, aulaId, webhookUrl);

  return NextResponse.json({ botId });
}
