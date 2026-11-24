import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/server/env";

/**
 * Cliente do Supabase com a chave de serviço. SÓ RODA NO SERVIDOR: essa chave
 * ignora a RLS e nunca pode chegar ao navegador. O navegador não fala com o banco.
 */
export function createAdminClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

let cached: SupabaseClient | undefined;

export function getAdminClient(): SupabaseClient {
  if (!cached) {
    const env = getEnv();
    cached = createAdminClient(env.supabaseUrl, env.supabaseServiceRoleKey);
  }
  return cached;
}
