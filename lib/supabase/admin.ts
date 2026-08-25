import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client server-only com a service role key: ignora RLS.
 * Uso restrito a rotas de servidor confiáveis (ex: webhook do Recall.ai),
 * que não têm sessão de usuário logado para autenticar via RLS normal.
 * NUNCA importar isso em um Client Component nem expor essa chave com NEXT_PUBLIC_.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
