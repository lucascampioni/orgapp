/**
 * Integração com a API do Google Calendar (OAuth + leitura de eventos).
 *
 * Precisa de um app OAuth criado no Google Cloud Console (ver README) -
 * GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET. O redirect_uri é calculado a
 * partir da própria requisição (mesmo padrão do webhook do Recall.ai), mas
 * precisa estar cadastrado nas "Authorized redirect URIs" do app no Google
 * Cloud Console, senão o Google recusa o login com "redirect_uri_mismatch".
 */
import { google, type calendar_v3 } from "googleapis";
import type { createClient } from "@/lib/supabase/server";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getOAuthClient(redirectUri: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );
}

export function buildAuthUrl(redirectUri: string, state: string) {
  const client = getOAuthClient(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
  });
}

export async function exchangeCode(redirectUri: string, code: string) {
  const client = getOAuthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  return tokens;
}

/** HH:MM no fuso de Brasília, a partir de um dateTime ISO do Google. */
export function horarioBrasil(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * O link de vídeo pode vir em hangoutLink (formato antigo, mais comum de
 * achar preenchido) ou dentro de conferenceData.entryPoints (formato atual
 * do Google) - tenta os dois, nessa ordem.
 */
export function linkDaVideochamada(evento: calendar_v3.Schema$Event): string | null {
  if (evento.hangoutLink) return evento.hangoutLink;
  const entryPoints = evento.conferenceData?.entryPoints ?? [];
  const video = entryPoints.find((e) => e.entryPointType === "video");
  return video?.uri ?? null;
}

const DIA_SEMANA: Record<string, string> = {
  MO: "segunda-feira",
  TU: "terça-feira",
  WE: "quarta-feira",
  TH: "quinta-feira",
  FR: "sexta-feira",
  SA: "sábado",
  SU: "domingo",
};

/**
 * Descreve em português a recorrência (RRULE) de um evento mestre do
 * Google, pra mostrar na hora de vincular ("Toda semana (quarta-feira)").
 * Cobre os padrões mais comuns de aula recorrente; RRULE mais exótica cai
 * no fallback genérico "Recorrente" em vez de tentar traduzir tudo.
 */
export function descreverRecorrencia(recurrence?: string[] | null): string | null {
  const rrule = recurrence?.find((r) => r.startsWith("RRULE:"));
  if (!rrule) return null;

  const partes = Object.fromEntries(
    rrule
      .replace("RRULE:", "")
      .split(";")
      .map((par) => par.split("=") as [string, string]),
  );

  const freq = partes.FREQ;
  const interval = Number(partes.INTERVAL ?? "1");
  const byday = partes.BYDAY?.split(",")
    .map((d) => DIA_SEMANA[d])
    .filter((d): d is string => !!d);

  if (freq === "WEEKLY" && byday && byday.length > 0) {
    const dias = byday.join(", ");
    return interval > 1 ? `A cada ${interval} semanas (${dias})` : `Toda semana (${dias})`;
  }
  if (freq === "WEEKLY") return interval > 1 ? `A cada ${interval} semanas` : "Toda semana";
  if (freq === "DAILY") return interval > 1 ? `A cada ${interval} dias` : "Todo dia";
  if (freq === "MONTHLY") return interval > 1 ? `A cada ${interval} meses` : "Todo mês";
  return "Recorrente";
}

export type GoogleTokens = {
  access_token: string;
  refresh_token?: string | null;
  expiry_date?: number | null;
};

/**
 * Monta um cliente autenticado do Calendar. O google-auth-library renova o
 * access_token sozinho (usando o refresh_token) quando necessário durante a
 * chamada - depois de usar, confira credentialsMudaram() pra saber se
 * precisa salvar um access_token novo no banco.
 */
export function getCalendarClient(redirectUri: string, tokens: GoogleTokens) {
  const client = getOAuthClient(redirectUri);
  client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? undefined,
    expiry_date: tokens.expiry_date ?? undefined,
  });
  const calendar = google.calendar({ version: "v3", auth: client });
  return { client, calendar };
}

/**
 * Carrega a conexão salva do professor e devolve um cliente do Calendar já
 * pronto pra usar, mais uma função pra persistir o access_token caso a
 * biblioteca tenha renovado ele sozinha durante as chamadas.
 */
export async function carregarClienteCalendar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  professorId: string,
  redirectUri: string,
) {
  const { data: conexao } = await supabase
    .from("google_conexoes")
    .select("access_token, refresh_token, expiry")
    .eq("professor_id", professorId)
    .maybeSingle();

  if (!conexao) return null;

  const { client, calendar } = getCalendarClient(redirectUri, {
    access_token: conexao.access_token,
    refresh_token: conexao.refresh_token,
    expiry_date: conexao.expiry ? new Date(conexao.expiry).getTime() : null,
  });

  return {
    calendar,
    async persistirTokenSeRenovado() {
      const creds = client.credentials;
      if (creds.access_token && creds.access_token !== conexao.access_token) {
        await supabase
          .from("google_conexoes")
          .update({
            access_token: creds.access_token,
            expiry: creds.expiry_date ? new Date(creds.expiry_date).toISOString() : null,
            atualizado_em: new Date().toISOString(),
          })
          .eq("professor_id", professorId);
      }
    },
  };
}
