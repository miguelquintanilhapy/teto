import { cacheLife, cacheTag } from "next/cache";
import { getAdminClient } from "@/server/db/client";
import { getEnv } from "@/server/env";
import { systemClock } from "@/server/clock";
import { SupabaseProfilesRepo } from "@/server/extraction/stores/supabase-repos";
import { summarizeExtractions, type ExtractionLog, type InsightsSummary } from "./insights";
import { SupabaseAiInsightsRepo, type CooldownView } from "./supabase-insights";

export const AI_TAG = "ai";

export interface AiInsights {
  /** Cadeia de modelos na ordem de tentativa (só nomes, nunca chaves). */
  chain: string[];
  summary: InsightsSummary;
  recent: ExtractionLog[];
  cooldowns: CooldownView[];
  quota: { used: number; limit: number };
}

/**
 * Tudo da tela de transparência da IA, em cache curto: os dados vêm das leituras já gravadas.
 * Devolve null se ainda não há perfil.
 */
export async function getAiInsights(): Promise<AiInsights | null> {
  "use cache";
  cacheTag(AI_TAG);
  cacheLife({ stale: 30, revalidate: 20, expire: 600 });

  const env = getEnv();
  const db = getAdminClient();
  const profile = await new SupabaseProfilesRepo(db).getDemoProfile();
  if (!profile) return null;

  const repo = new SupabaseAiInsightsRepo(db);
  const now = new Date();
  const [logs, cooldowns, used] = await Promise.all([
    repo.recent(profile.id),
    repo.activeCooldowns(now.toISOString()),
    repo.quotaUsed(systemClock.today()),
  ]);

  return {
    chain: env.modelChain.map((c) => `${c.provider}:${c.model}`),
    summary: summarizeExtractions(logs),
    recent: logs.slice(0, 8),
    cooldowns,
    quota: { used, limit: env.extractionDailyQuota },
  };
}
