import { getAdminClient } from "@/server/db/client";
import { getEnv } from "@/server/env";
import { createRouterFromEnv } from "@/server/extraction/providers";
import { PostgresCooldownStore, PostgresQuotaGuard } from "@/server/extraction/stores/postgres";
import {
  SupabaseDocumentsRepo,
  SupabaseExtractionsRepo,
  SupabaseFileStorage,
  SupabaseProfilesRepo,
} from "@/server/extraction/stores/supabase-repos";
import type { UploadHandlerDeps } from "@/server/http/upload-handler";

let cached: UploadHandlerDeps | undefined;

/**
 * Raiz de composição: o único lugar que liga as portas às implementações reais
 * (Supabase, provedores de IA). Todo o resto depende só das interfaces.
 */
export function getUploadHandlerDeps(): UploadHandlerDeps {
  if (cached) return cached;
  const env = getEnv();
  const db = getAdminClient();
  const router = createRouterFromEnv(env, {
    cooldownStore: new PostgresCooldownStore(db),
    quota: new PostgresQuotaGuard(db, env.extractionDailyQuota),
  });
  cached = {
    profiles: new SupabaseProfilesRepo(db),
    upload: {
      documents: new SupabaseDocumentsRepo(db),
      extractions: new SupabaseExtractionsRepo(db),
      storage: new SupabaseFileStorage(db),
      extractor: router,
    },
  };
  return cached;
}
