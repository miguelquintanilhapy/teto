import type { Cents, MeiConfig } from "./config";
import { toleranceLimitFor } from "./limits";

export type AlertKind = "threshold_warning" | "threshold_critical" | "over_limit" | "over_tolerance";

const ORDER: ReadonlyArray<AlertKind> = [
  "threshold_warning",
  "threshold_critical",
  "over_limit",
  "over_tolerance",
];

/** Todos os alertas que a situação atual já justifica (acumulativo). */
export function dueAlertKinds(
  accumulated: Cents,
  limit: Cents,
  cfg: Pick<MeiConfig, "warningRatio" | "criticalRatio" | "toleranceRate">,
): AlertKind[] {
  if (limit <= 0) return accumulated > 0 ? [...ORDER] : [];
  const ratio = accumulated / limit;
  const due: AlertKind[] = [];
  if (ratio >= cfg.warningRatio) due.push("threshold_warning");
  if (ratio >= cfg.criticalRatio) due.push("threshold_critical");
  if (accumulated > limit) due.push("over_limit");
  if (accumulated > toleranceLimitFor(limit, cfg.toleranceRate)) due.push("over_tolerance");
  return due;
}

/**
 * Alertas novos a disparar. É idempotente: o que já foi disparado antes não
 * se repete, mesmo que a função rode a cada upload ou a cada cron.
 */
export function newAlerts(
  accumulated: Cents,
  limit: Cents,
  alreadyFired: ReadonlySet<AlertKind>,
  cfg: Pick<MeiConfig, "warningRatio" | "criticalRatio" | "toleranceRate">,
): AlertKind[] {
  return dueAlertKinds(accumulated, limit, cfg).filter((k) => !alreadyFired.has(k));
}
