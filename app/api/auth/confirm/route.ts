import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Pra onde o Supabase redireciona depois que a pessoa clica no link de
 * e-mail de redefinição de senha (resetPasswordForEmail). O link carrega
 * um "code" (fluxo PKCE do @supabase/ssr) que precisa ser trocado por uma
 * sessão de verdade antes de deixar a pessoa definir a senha nova - essa
 * troca só funciona aqui (Route Handler), não dá em Server Component.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/redefinir-senha";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/esqueci-senha?erro=link_invalido`);
}
