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

// A API do Recall.ai é dividida por região (a chave só funciona na região
// em que a conta foi criada). Configure RECALL_REGION se sua conta não for
// us-west-2 — a região da sua conta aparece na própria URL do dashboard
// (ex: https://us-west-2.recall.ai/dashboard/...) ou no erro 401 da API.
const RECALL_REGION = process.env.RECALL_REGION || "us-west-2";
const RECALL_API_BASE = `https://${RECALL_REGION}.recall.ai/api/v1`;

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
      webhook_url: webhookUrl,
      // O campo antigo "transcription_options" foi descontinuado pela
      // Recall.ai (dava 400 "This field is not allowed"). No formato atual
      // a transcrição precisa ser pedida por bot em recording_config -
      // configurar a Gladia só no dashboard não liga a transcrição sozinho.
      // A própria API devolveu a lista de chaves aceitas nessa conta num
      // erro 400 anterior; "gladia_v2_streaming" é a chave certa (não
      // "gladia_v2"). code_switching liga porque a aula mistura português e
      // inglês na mesma fala.
      recording_config: {
        transcript: {
          provider: {
            gladia_v2_streaming: {
              language_config: {
                code_switching: true,
              },
            },
          },
        },
      },
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

/**
 * O evento "transcript.done" traz data.transcript.id - um recurso próprio,
 * não aninhado no bot. Só esse evento carrega esse id (outros eventos do
 * bot, como bot.done, não têm transcript nenhum ainda).
 */
export function extractTranscriptId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  const data = obj.data as Record<string, unknown> | undefined;
  const transcript = data?.transcript as Record<string, unknown> | undefined;
  return typeof transcript?.id === "string" ? transcript.id : null;
}

export async function getTranscriptText(transcriptId: string): Promise<string> {
  // GET /bot/{id}/transcript/ é o endpoint antigo e não existe mais nesse
  // formato para bots criados com recording_config - a transcrição agora é
  // um recurso próprio (transcript.id vindo do webhook), buscado aqui e
  // baixado via download_url (guardado em blob storage, não inline).
  const res = await fetch(`${RECALL_API_BASE}/transcript/${transcriptId}/`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(
      `Falha ao buscar transcript no Recall.ai (${res.status}): ${await res.text()}`,
    );
  }

  const meta = (await res.json()) as Record<string, unknown>;
  const downloadUrl = findDownloadUrl(meta);
  if (!downloadUrl) {
    console.error("Transcript sem download_url reconhecível", JSON.stringify(meta).slice(0, 2000));
    throw new Error("Resposta do transcript sem download_url");
  }

  const fileRes = await fetch(downloadUrl);
  if (!fileRes.ok) {
    throw new Error(`Falha ao baixar transcript (${fileRes.status})`);
  }

  const data = (await fileRes.json()) as unknown;
  return flattenTranscript(data);
}

/** Tenta achar a download_url em alguns formatos plausíveis de resposta. */
function findDownloadUrl(meta: Record<string, unknown>): string | null {
  const paths: unknown[] = [
    (meta.data as Record<string, unknown> | undefined)?.download_url,
    meta.download_url,
    ((meta.data as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined)
      ?.download_url,
  ];
  const found = paths.find((v) => typeof v === "string");
  return typeof found === "string" ? found : null;
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
