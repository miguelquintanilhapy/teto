import type { Cents, MeiConfig } from "./config";
import { classifyRisk, estimateOverrunCost, type CostEstimate } from "./risk";
import type { RiskBand } from "./types";

export interface ScenarioResult {
  before: { accumulatedCents: Cents; band: RiskBand; cost: CostEstimate };
  after: { accumulatedCents: Cents; band: RiskBand; cost: CostEstimate };
  /** Custo adicional estimado causado pela receita simulada. */
  additionalCostCents: Cents;
  /** A receita simulada muda a faixa de risco? */
  changesBand: boolean;
  /** Quanto ainda cabe no limite antes da simulação (0 se já passou). */
  headroomBeforeCents: Cents;
}

type ScenarioConfig = Pick<
  MeiConfig,
  "toleranceRate" | "warningRatio" | "criticalRatio" | "excessTaxRate" | "retroactiveTaxRate"
>;

/** "E se eu aceitar uma venda de R$ X?" */
export function simulateExtraRevenue(
  accumulatedCents: Cents,
  extraCents: Cents,
  limitCents: Cents,
  cfg: ScenarioConfig,
): ScenarioResult {
  if (!Number.isInteger(extraCents) || extraCents < 0) {
    throw new RangeError("extraCents deve ser um inteiro não negativo");
  }
  const afterTotal = accumulatedCents + extraCents;
  const before = {
    accumulatedCents,
    band: classifyRisk(accumulatedCents, limitCents, cfg),
    cost: estimateOverrunCost(accumulatedCents, limitCents, cfg),
  };
  const after = {
    accumulatedCents: afterTotal,
    band: classifyRisk(afterTotal, limitCents, cfg),
    cost: estimateOverrunCost(afterTotal, limitCents, cfg),
  };
  return {
    before,
    after,
    additionalCostCents: after.cost.estimatedCents - before.cost.estimatedCents,
    changesBand: before.band !== after.band,
    headroomBeforeCents: Math.max(0, limitCents - accumulatedCents),
  };
}
