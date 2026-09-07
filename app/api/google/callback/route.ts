import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode, getOAuthClient } from "@/lib/google";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }

  const erroGoogle = request.nextUrl.searchParams.get("error");
  if (erroGoogle) {
    return NextResponse.redirect(
      new URL(`/calendario?google_erro=${erroGoogle}`, request.nextUrl.origin),
    );
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get("google_oauth_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/calendario?google_erro=estado_invalido", request.nextUrl.origin),
    );
  }

  const redirectUri = new URL("/api/google/callback", request.nextUrl.origin).toString();

  let tokens: Awaited<ReturnType<typeof exchangeCode>>;
  try {
    tokens = await exchangeCode(redirectUri, code);
  } catch (err) {
    console.error("Falha ao trocar code por tokens do Google", err);
    return NextResponse.redirect(new URL("/calendario?google_erro=token", request.nextUrl.origin));
  }

  if (!tokens.access_token) {
    return NextResponse.redirect(new URL("/calendario?google_erro=sem_token", request.nextUrl.origin));
  }

  let googleEmail: string | null = null;
  try {
    const client = getOAuthClient(redirectUri);
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const info = await oauth2.userinfo.get();
    googleEmail = info.data.email ?? null;
  } catch (err) {
    console.error("Falha ao buscar e-mail da conta Google", err);
  }

  const { error } = await supabase.from("google_conexoes").upsert({
    professor_id: user.id,
    google_email: googleEmail,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? undefined,
    expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    atualizado_em: new Date().toISOString(),
  });

  if (error) {
    console.error("Falha ao salvar conexão do Google", error);
    return NextResponse.redirect(new URL("/calendario?google_erro=salvar", request.nextUrl.origin));
  }

  const response = NextResponse.redirect(
    new URL("/calendario?google_conectado=1", request.nextUrl.origin),
  );
  response.cookies.delete("google_oauth_state");
  return response;
}
