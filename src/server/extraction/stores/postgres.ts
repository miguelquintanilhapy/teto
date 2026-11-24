import type { SupabaseClient } from "@supabase/supabase-js";
import type { ISODate } from "@/core";
import type { CooldownStore } from "../cooldown";
import type { QuotaGuard } from "../quota";

/**
 * Cooldown dos provedores no Postgres (tabela provider_cooldowns). Em serverless,
 * memória de instância não vale entre requisições: o estado precisa ser compartilhado.
 */
export class PostgresCooldownStore implements CooldownStore {
  constructor(private readonly db: SupabaseClient) {}

  async blockedUntil(providerId: string): Promise<number | null> {
    const { data, error } = await this.db
      .from("provider_cooldowns")
      .select("blocked_until")
      .eq("provider_id", providerId)
      .maybeSingle();
    if (error) throw new Error(`cooldown: ${error.message}`);
    return data ? Date.parse((data as { blocked_until: string }).blocked_until) : null;
  }

  async block(providerId: string, untilMs: number, reason: string): Promise<void> {
    const { error } = await this.db
      .from("provider_cooldowns")
      .upsert({ provider_id: providerId, blocked_until: new Date(untilMs).toISOString(), reason: reason.slice(0, 200) });
    if (error) throw new Error(`cooldown: ${error.message}`);
  }
}

/**
 * Teto diário de extrações, atômico no banco (função consume_daily_quota):
 * duas requisições simultâneas nunca passam do limite.
 */
export class PostgresQuotaGuard implements QuotaGuard {
  constructor(
    private readonly db: SupabaseClient,
    private readonly limitPerDay: number,
  ) {}

  async tryConsume(day: ISODate): Promise<boolean> {
    const { data, error } = await this.db.rpc("consume_daily_quota", { p_day: day, p_limit: this.limitPerDay });
    if (error) throw new Error(`quota: ${error.message}`);
    return data === true;
  }
}
