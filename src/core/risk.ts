import type { Cents, MeiConfig } from "./config";
import { toleranceLimitFor } from "./limits";
import type { RiskBand } from "./types";

type RiskConfig = Pick<MeiConfig, "toleranceRate" | "warningRatio" | "criticalRatio">;

export function classifyRisk(accumulated: Cents, limit: Cents, cfg: RiskConfig): RiskBand {
  if (limit <= 0) return accumulated > 0 ? "over_retroactive" : "ok";
  if (accumulated > toleranceLimitFor(limit, cfg.toleranceRate)) return "over_retroactive";
  if (accumulated > limit) return "over_tolerance";
  const ratio = accumulated / limit;
  if (ratio >= cfg.criticalRatio) return "critical";
  if (ratio >= cfg.warningRatio) return "attention";
  return "ok";
}

export interface CostEstimate {
  kind: "none" | "excess_das" | "retroactive";
  /** Estimativa em centavos. Sempre rotulada como estimativa na interface. */
  estimatedCents: Cents;
  isEstimate: true;
}

/**
 * Estima o custo do estouro. Os percentuais vêm da configuração e são
 * aproximações, nunca valores oficiais (ver docs/mei-rules.md).
 */
export function estimateOverrunCost(
  accumulated: Cents,
  limit: Cents,
  cfg: RiskConfig & Pick<MeiConfig, "excessTaxRate" | "retroactiveTaxRate">,
): CostEstimate {
  const band = classifyRisk(accumulated, limit, cfg);
  if (band === "over_tolerance") {
    return {
      kind: "excess_das",
      estimatedCents: Math.round((accumulated - limit) * cfg.excessTaxRate),
      isEstimate: true,
    };
  }
  if (band === "over_retroactive") {
    return {
      kind: "retroactive",
      estimatedCents: Math.round(accumulated * cfg.retroactiveTaxRate),
      isEstimate: true,
    };
  }
  return { kind: "none", estimatedCents: 0, isEstimate: true };
}
