import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { carregarClienteCalendar } from "@/lib/google";

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

    const eventos = (res.data.items ?? []).map((e) => ({
      id: e.id,
      recurringEventId: e.recurringEventId ?? null,
      summary: e.summary ?? "(sem título)",
      start: e.start?.dateTime ?? e.start?.date ?? null,
      hangoutLink: e.hangoutLink ?? null,
    }));

    return NextResponse.json({ eventos });
  } catch (err) {
    console.error("Falha ao buscar eventos do Google Calendar", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Falha ao buscar eventos: ${detail}` }, { status: 502 });
  }
}
