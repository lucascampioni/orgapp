/**
 * Integração com a API do Recall.ai (bot que entra numa reunião do Meet,
 * grava e transcreve).
 *
 * IMPORTANTE: este arquivo foi escrito a partir do conhecimento geral da
 * API do Recall.ai, sem acesso à documentação ao vivo no momento em que
 * foi escrito. Antes de confiar nisso em produção, confira em
 * https://docs.recall.ai se os endpoints, o header de autenticação e o
 * formato do payload do webhook batem com o que está aqui — em especial:
 *   - POST /api/v1/bot/ (criar o bot) e o formato do corpo da resposta
 *   - GET /api/v1/bot/{id}/transcript/ e o formato dos segmentos
 *   - o payload que o Recall envia pro webhook quando a transcrição termina
 * Teste com uma reunião real antes de usar de verdade.
 */

const RECALL_API_BASE = "https://api.recall.ai/api/v1";

function authHeaders() {
  return {
    Authorization: `Token ${process.env.RECALL_API_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function createBot(meetingUrl: string, webhookUrl: string) {
  const res = await fetch(`${RECALL_API_BASE}/bot/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      meeting_url: meetingUrl,
      bot_name: "Painel da Professora",
      transcription_options: { provider: "meeting_captions" },
      webhook_url: webhookUrl,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Falha ao criar bot no Recall.ai (${res.status}): ${await res.text()}`,
    );
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

/** Extrai um bot id de formatos plausíveis de payload de webhook. */
export function extractBotId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const direct = obj.bot_id ?? obj.id;
  if (typeof direct === "string") return direct;
  const nested = obj.data as Record<string, unknown> | undefined;
  const nestedBot = nested?.bot as Record<string, unknown> | undefined;
  if (typeof nestedBot?.id === "string") return nestedBot.id;
  return null;
}

export async function getTranscriptText(botId: string): Promise<string> {
  const res = await fetch(`${RECALL_API_BASE}/bot/${botId}/transcript/`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(
      `Falha ao buscar transcript no Recall.ai (${res.status}): ${await res.text()}`,
    );
  }

  const data = (await res.json()) as unknown;
  return flattenTranscript(data);
}

/** Tenta lidar com alguns formatos plausíveis de resposta de transcript. */
function flattenTranscript(data: unknown): string {
  if (typeof data === "string") return data;
  if (!Array.isArray(data)) return "";

  return data
    .map((segment) => {
      if (typeof segment === "string") return segment;
      if (segment && typeof segment === "object") {
        const s = segment as Record<string, unknown>;
        if (typeof s.text === "string") return s.text;
        if (Array.isArray(s.words)) {
          return s.words
            .map((w) =>
              typeof w === "object" && w && "text" in w
                ? String((w as { text: unknown }).text)
                : "",
            )
            .join(" ");
        }
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}
