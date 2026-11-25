import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExtractionLog } from "./insights";

export interface CooldownView {
  providerId: string;
  blockedUntil: string;
  reason: string;
}

interface ExtractionRow {
  id: string;
  status: ExtractionLog["status"];
  provider_id: string | null;
  prompt_version: string;
  created_at: string;
  attempts: ExtractionLog["attempts"] | null;
}

/** Leituras só de consulta: alimentam a tela de transparência da IA. */
export class SupabaseAiInsightsRepo {
  constructor(private readonly db: SupabaseClient) {}

  async recent(profileId: string, limit = 60): Promise<ExtractionLog[]> {
    const { data, error } = await this.db
      .from("extractions")
      .select("id, status, provider_id, prompt_version, created_at, attempts, documents!inner(profile_id)")
      .eq("documents.profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`extractions: ${error.message}`);
    return ((data ?? []) as unknown as ExtractionRow[]).map((r) => ({
      id: r.id,
      status: r.status,
      providerId: r.provider_id,
      promptVersion: r.prompt_version,
      createdAt: r.created_at,
      attempts: Array.isArray(r.attempts) ? r.attempts : [],
    }));
  }

  /** Provedores em pausa agora (circuit breaker). */
  async activeCooldowns(nowIso: string): Promise<CooldownView[]> {
    const { data, error } = await this.db
      .from("provider_cooldowns")
      .select("provider_id, blocked_until, reason")
      .gt("blocked_until", nowIso);
    if (error) throw new Error(`provider_cooldowns: ${error.message}`);
    return ((data ?? []) as Array<{ provider_id: string; blocked_until: string; reason: string }>).map((r) => ({
      providerId: r.provider_id,
      blockedUntil: r.blocked_until,
      reason: r.reason,
    }));
  }

  async quotaUsed(day: string): Promise<number> {
    const { data, error } = await this.db.from("daily_quota").select("extractions").eq("day", day).maybeSingle();
    if (error) throw new Error(`daily_quota: ${error.message}`);
    return data ? Number((data as { extractions: number }).extractions) : 0;
  }
}
