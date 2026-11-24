import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertKind } from "@/core";
import type { AlertRow, AlertsRepo } from "./ports";

export class SupabaseAlertsRepo implements AlertsRepo {
  constructor(private readonly db: SupabaseClient) {}

  async ensure(profileId: string, kind: AlertKind, year: number): Promise<void> {
    const { error } = await this.db
      .from("alerts")
      .upsert({ profile_id: profileId, kind, reference_year: year }, { onConflict: "profile_id,kind,reference_year", ignoreDuplicates: true });
    if (error) throw new Error(`alerts: ${error.message}`);
  }

  async list(profileId: string, year: number): Promise<AlertRow[]> {
    const { data, error } = await this.db
      .from("alerts")
      .select("kind, reference_year, created_at, sent_at")
      .eq("profile_id", profileId)
      .eq("reference_year", year)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`alerts: ${error.message}`);
    return ((data ?? []) as Array<{ kind: AlertKind; reference_year: number; created_at: string; sent_at: string | null }>).map((r) => ({
      kind: r.kind,
      referenceYear: r.reference_year,
      createdAt: r.created_at,
      sentAt: r.sent_at,
    }));
  }

  async claim(profileId: string, kinds: AlertKind[], year: number, sentAtIso: string): Promise<AlertKind[]> {
    if (kinds.length === 0) return [];
    // `is null` + update numa só instrução: só uma das rodadas simultâneas consegue reservar cada linha.
    const { data, error } = await this.db
      .from("alerts")
      .update({ sent_at: sentAtIso })
      .eq("profile_id", profileId)
      .eq("reference_year", year)
      .in("kind", kinds)
      .is("sent_at", null)
      .select("kind");
    if (error) throw new Error(`alerts: ${error.message}`);
    return ((data ?? []) as Array<{ kind: AlertKind }>).map((r) => r.kind);
  }

  async release(profileId: string, kinds: AlertKind[], year: number): Promise<void> {
    if (kinds.length === 0) return;
    const { error } = await this.db
      .from("alerts")
      .update({ sent_at: null })
      .eq("profile_id", profileId)
      .eq("reference_year", year)
      .in("kind", kinds);
    if (error) throw new Error(`alerts: ${error.message}`);
  }
}
