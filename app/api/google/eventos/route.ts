import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { carregarClienteCalendar, descreverRecorrencia } from "@/lib/google";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const redirectUri = new URL("/api/google/callback", request.nextUrl.origin).toString();
  const conexao = await carregarClienteCalendar(supabase, user.id, redirectUri);
  if (!conexao) {
    return NextResponse.json({ error: "Google Calendar não conectado" }, { status: 400 });
  }

  const agora = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() + 60);

  try {
    const res = await conexao.calendar.events.list({
      calendarId: "primary",
      timeMin: agora.toISOString(),
      timeMax: limite.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });
    await conexao.persistirTokenSeRenovado();

    const itens = res.data.items ?? [];

    // singleEvents:true devolve as ocorrências já expandidas, sem o RRULE
    // (isso só existe no evento mestre) - busca o mestre uma vez por série
    // (não por ocorrência) só pra extrair a recorrência legível.
    const idsRecorrentes = [...new Set(itens.map((e) => e.recurringEventId).filter((id): id is string => !!id))];
    const recorrenciaPorId = new Map<string, string | null>();
    await Promise.all(
      idsRecorrentes.map(async (id) => {
        try {
          const mestre = await conexao.calendar.events.get({ calendarId: "primary", eventId: id });
          recorrenciaPorId.set(id, descreverRecorrencia(mestre.data.recurrence));
        } catch (err) {
          console.error("Falha ao buscar evento mestre pra recorrência", id, err);
          recorrenciaPorId.set(id, null);
        }
      }),
    );

    const eventos = itens.map((e) => ({
      id: e.id,
      recurringEventId: e.recurringEventId ?? null,
      summary: e.summary ?? "(sem título)",
      start: e.start?.dateTime ?? e.start?.date ?? null,
      hangoutLink: e.hangoutLink ?? null,
      recorrencia: e.recurringEventId ? recorrenciaPorId.get(e.recurringEventId) ?? null : null,
    }));

    return NextResponse.json({ eventos });
  } catch (err) {
    console.error("Falha ao buscar eventos do Google Calendar", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Falha ao buscar eventos: ${detail}` }, { status: 502 });
  }
}
