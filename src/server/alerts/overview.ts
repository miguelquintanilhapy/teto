import { cacheLife, cacheTag } from "next/cache";
import { yearOf } from "@/core";
import { getAlertsDeps } from "@/server/composition";
import { PANEL_TAG } from "@/server/panel-cache";
import type { AlertRow } from "./ports";

export interface AlertsOverview {
  year: number;
  rows: AlertRow[];
  emailConfigured: boolean;
  /** Só o destino mascarado; o endereço inteiro nunca vai para a tela. */
  email: string;
}

/** Situação dos alertas do ano para a tela de alertas. Mesma etiqueta do painel, então muda junto. */
export async function getAlertsOverview(): Promise<AlertsOverview | null> {
  "use cache";
  cacheTag(PANEL_TAG);
  cacheLife({ stale: 60, revalidate: 30, expire: 3600 });

  const deps = getAlertsDeps();
  const profile = await deps.profiles.getDemoProfile();
  if (!profile) return null;
  const year = yearOf(deps.clock.today());
  return {
    year,
    rows: await deps.alerts.list(profile.id, year),
    emailConfigured: deps.sender !== null,
    email: profile.email,
  };
}
