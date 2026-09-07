import type { createClient } from "@/lib/supabase/server";
import { createBot } from "@/lib/recall";

/** Um minuto antes do horário marcado - dá tempo do bot entrar antes do
 * aluno/professor, sem entrar cedo demais numa sala vazia. */
const ANTECEDENCIA_MS = 60_000;

/**
 * Brasil aboliu o horário de verão em 2019, então -03:00 vale o ano
 * inteiro pra America/Sao_Paulo - não precisa de lib de timezone pra
 * converter data+horario (campos soltos, sem timezone) pra um instante.
 */
function dataHorarioParaInstante(data: string, horario: string): Date {
  return new Date(`${data}T${horario}:00-03:00`);
}

/**
 * Agenda um bot do Recall.ai pra entrar sozinho 1 minuto antes do horário
 * marcado da aula (via join_at nativo da API - a Recall cuida de esperar o
 * horário certo, não precisa de cron rodando aqui). Não faz nada se a aula
 * já tiver bot (evita duplicar - não reagenda se o horário mudar depois),
 * não tiver link/data/horário, não estiver "planejada" ou se o horário de
 * entrada já tiver passado (nesses casos o professor usa o botão manual).
 */
export async function agendarBotSeNecessario(
  supabase: Awaited<ReturnType<typeof createClient>>,
  aulaId: string,
  webhookUrl: string,
): Promise<string | null> {
  const { data: aula } = await supabase
    .from("aulas")
    .select("id, data, horario, meet_link, recall_bot_id, status")
    .eq("id", aulaId)
    .maybeSingle();

  if (
    !aula ||
    aula.recall_bot_id ||
    !aula.meet_link ||
    !aula.data ||
    !aula.horario ||
    aula.status !== "planejada"
  ) {
    return null;
  }

  const joinAt = new Date(
    dataHorarioParaInstante(aula.data, aula.horario).getTime() - ANTECEDENCIA_MS,
  );
  if (joinAt.getTime() <= Date.now()) {
    return null;
  }

  try {
    const botId = await createBot(aula.meet_link, webhookUrl, joinAt.toISOString());
    await supabase.from("aulas").update({ recall_bot_id: botId }).eq("id", aulaId);
    return botId;
  } catch (err) {
    console.error("Falha ao agendar bot automaticamente pra aula", aulaId, err);
    return null;
  }
}
