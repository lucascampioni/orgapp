import { NextResponse, type NextRequest } from "next/server";
import type { calendar_v3 } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { carregarClienteCalendar, horarioBrasil, linkDaVideochamada } from "@/lib/google";
import { agendarBotSeNecessario } from "@/lib/recall-agendamento";

export async function POST(request: NextRequest) {
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

  const { data: vinculos, error: vinculosError } = await supabase
    .from("google_vinculos")
    .select("*")
    .eq("professor_id", user.id);

  if (vinculosError) {
    return NextResponse.json({ error: vinculosError.message }, { status: 500 });
  }
  if (!vinculos || vinculos.length === 0) {
    return NextResponse.json({ ok: true, criadas: 0 });
  }

  // Começa 30 dias no passado (não só "agora pra frente") pra pegar aulas
  // recentes que já aconteceram, não só as futuras.
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 30);
  const limite = new Date();
  limite.setDate(limite.getDate() + 90);

  let eventos: calendar_v3.Schema$Event[];
  try {
    const res = await conexao.calendar.events.list({
      calendarId: "primary",
      timeMin: inicio.toISOString(),
      timeMax: limite.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 2500,
    });
    await conexao.persistirTokenSeRenovado();
    eventos = res.data.items ?? [];
  } catch (err) {
    console.error("Falha ao buscar eventos pra sincronizar", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Falha ao buscar eventos: ${detail}` }, { status: 502 });
  }

  const vinculoPorGoogleId = new Map(vinculos.map((v) => [v.google_recurring_event_id, v]));

  // Instância cancelada de um evento recorrente continua aparecendo na
  // listagem (com status "cancelled"), em vez de simplesmente sumir - trata
  // como se não existisse mais, tanto pra não recriar quanto pra detectar
  // que foi removida (mais abaixo).
  const eventosAtivos = (eventos ?? []).filter((e) => e.status !== "cancelled");
  const idsAtivosNoGoogle = new Set(eventosAtivos.map((e) => e.id).filter((id): id is string => !!id));

  const candidatos = eventosAtivos
    .map((e) => {
      const chave = e.recurringEventId ?? e.id;
      const vinculo = chave ? vinculoPorGoogleId.get(chave) : undefined;
      if (!vinculo || !e.id) return null;
      const inicioEvento = e.start?.dateTime ?? e.start?.date ?? "";
      const data = inicioEvento.slice(0, 10);
      if (!data) return null;
      return {
        aluno_id: vinculo.aluno_id as string,
        professor_id: user.id,
        turma_id: null,
        titulo: vinculo.titulo || e.summary || "Aula",
        data,
        horario: e.start?.dateTime ? horarioBrasil(e.start.dateTime) : null,
        status: "planejada" as const,
        meet_link: linkDaVideochamada(e),
        google_event_id: e.id,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  // Aula que já foi importada do Google mas o evento sumiu de lá (apagado
  // ou instância cancelada) dentro da mesma janela que acabamos de
  // consultar - remove daqui também. Só mexe em aulas "planejada" (nunca
  // apaga uma aula que já foi dada/gravada só porque o evento sumiu depois).
  const { data: sincronizadas } = await supabase
    .from("aulas")
    .select("id, google_event_id")
    .eq("professor_id", user.id)
    .eq("status", "planejada")
    .not("google_event_id", "is", null)
    .gte("data", inicio.toISOString().slice(0, 10))
    .lte("data", limite.toISOString().slice(0, 10));

  const idsParaRemover = (sincronizadas ?? [])
    .filter((a) => a.google_event_id && !idsAtivosNoGoogle.has(a.google_event_id))
    .map((a) => a.id);

  if (idsParaRemover.length > 0) {
    const { error: deleteError } = await supabase.from("aulas").delete().in("id", idsParaRemover);
    if (deleteError) {
      console.error("Falha ao remover aulas apagadas no Google Calendar", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  if (candidatos.length === 0) {
    return NextResponse.json({ ok: true, criadas: 0, removidas: idsParaRemover.length });
  }

  const { data: existentes } = await supabase
    .from("aulas")
    .select("id, google_event_id, data, horario, meet_link")
    .eq("professor_id", user.id)
    .in(
      "google_event_id",
      candidatos.map((c) => c.google_event_id),
    );

  const existentePorGoogleId = new Map((existentes ?? []).map((a) => [a.google_event_id, a]));
  const novas = candidatos.filter((c) => !existentePorGoogleId.has(c.google_event_id));

  // Um evento já vinculado pode ter data/horário/link mudados direto no
  // Google (ex: professor remarcou o horário) - reflete isso na aula já
  // existente em vez de só ignorar por já ter sido sincronizada antes.
  const atualizacoes = candidatos
    .map((c) => {
      const existente = existentePorGoogleId.get(c.google_event_id);
      if (!existente) return null;
      const mudou =
        existente.data !== c.data ||
        existente.horario !== c.horario ||
        (c.meet_link && existente.meet_link !== c.meet_link);
      if (!mudou) return null;
      return {
        id: existente.id,
        data: c.data,
        horario: c.horario,
        meet_link: c.meet_link ?? existente.meet_link,
      };
    })
    .filter((a): a is NonNullable<typeof a> => a !== null);

  let idsNovas: string[] = [];
  if (novas.length > 0) {
    const { data: inseridas, error: insertError } = await supabase
      .from("aulas")
      .insert(novas)
      .select("id");
    if (insertError) {
      console.error("Falha ao criar aulas a partir do Google Calendar", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    idsNovas = (inseridas ?? []).map((a) => a.id);
  }

  for (const atualizacao of atualizacoes) {
    const { id, ...campos } = atualizacao;
    const { error: updateError } = await supabase.from("aulas").update(campos).eq("id", id);
    if (updateError) {
      console.error("Falha ao atualizar aula a partir do Google Calendar", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  // Aula importada do Google já tem link+data+horário - agenda o bot de
  // gravação sozinho, sem o professor precisar clicar em nada.
  const webhookUrl = new URL("/api/recall/webhook", request.nextUrl.origin).toString();
  for (const id of [...idsNovas, ...atualizacoes.map((a) => a.id)]) {
    await agendarBotSeNecessario(supabase, id, webhookUrl);
  }

  return NextResponse.json({
    ok: true,
    criadas: novas.length,
    atualizadas: atualizacoes.length,
    removidas: idsParaRemover.length,
  });
}
