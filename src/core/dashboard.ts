import { rulesFor, type Cents, type MeiConfig } from "./config";
import { dueAlertKinds, type AlertKind } from "./alerts";
import { daysUntilDas, nextDasDueDate } from "./das";
import { yearOf, type ISODate } from "./dates";
import { accumulatedRevenue, annualLimitFor, toleranceLimitFor } from "./limits";
import { projectYear, type YearProjection } from "./projection";
import { classifyRisk, estimateOverrunCost, type CostEstimate } from "./risk";
import type { RiskBand, Transaction } from "./types";

export interface DashboardInput {
  transactions: ReadonlyArray<Transaction>;
  /** Hoje, no fuso de Brasília (calculado na borda do sistema). */
  today: ISODate;
  /** Data de abertura do MEI; define o limite proporcional no ano de abertura. */
  openingDate: ISODate | null;
  /** Regras do ano; por padrão, `rulesFor` do ano de `today`. */
  cfg?: MeiConfig;
}

export interface Dashboard {
  year: number;
  /** Limite do ano para este MEI (proporcional se abriu no ano). */
  limitCents: Cents;
  /** Limite máximo tolerado antes do desenquadramento retroativo. */
  toleranceLimitCents: Cents;
  accumulatedCents: Cents;
  /** accumulated / limit (0 se o limite for zero). Pode passar de 1. */
  usedRatio: number;
  /** Quanto ainda cabe até o limite (nunca negativo). */
  headroomCents: Cents;
  band: RiskBand;
  /** Estimativa, nunca valor oficial. */
  cost: CostEstimate;
  projection: YearProjection;
  das: { nextDueDate: ISODate; daysUntil: number };
  /** Alertas que a situação atual já justifica (o envio idempotente é feito à parte). */
  alerts: AlertKind[];
  /** Quantas transações aguardam conferência (não entram nos cálculos). */
  pendingCount: number;
  confirmedRevenueCount: number;
}

/**
 * O resumo que o painel mostra. Função pura: só combina as regras do núcleo.
 * Conta apenas receitas confirmadas até hoje, no ano de `today`.
 */
export function buildDashboard(input: DashboardInput): Dashboard {
  const { transactions, today, openingDate } = input;
  const year = yearOf(today);
  const cfg = input.cfg ?? rulesFor(year);

  const limitCents = annualLimitFor(openingDate, year, cfg);
  const accumulatedCents = accumulatedRevenue(transactions, year, today);
  const inYear = transactions.filter((t) => yearOf(t.date) === year);

  return {
    year,
    limitCents,
    toleranceLimitCents: toleranceLimitFor(limitCents, cfg.toleranceRate),
    accumulatedCents,
    usedRatio: limitCents > 0 ? accumulatedCents / limitCents : 0,
    headroomCents: Math.max(0, limitCents - accumulatedCents),
    band: classifyRisk(accumulatedCents, limitCents, cfg),
    cost: estimateOverrunCost(accumulatedCents, limitCents, cfg),
    projection: projectYear({ transactions, today, openingDate, limitCents, cfg }),
    das: { nextDueDate: nextDasDueDate(today, cfg.dasDueDay), daysUntil: daysUntilDas(today, cfg.dasDueDay) },
    alerts: dueAlertKinds(accumulatedCents, limitCents, cfg),
    pendingCount: inYear.filter((t) => t.status === "pendente").length,
    confirmedRevenueCount: inYear.filter((t) => t.status === "confirmada" && t.kind === "receita" && t.date <= today).length,
  };
}
