import type { Cents, MeiConfig } from "./config";
import { monthOf, yearOf, type ISODate } from "./dates";
import type { Transaction } from "./types";

/**
 * Limite anual aplicável ao MEI no ano informado.
 * No ano de abertura o limite é proporcional aos meses ativos (o mês de
 * abertura conta como mês inteiro). Antes da abertura o limite é zero.
 */
export function annualLimitFor(
  openingDate: ISODate | null,
  year: number,
  cfg: Pick<MeiConfig, "annualLimitCents">,
): Cents {
  if (openingDate === null) return cfg.annualLimitCents;
  const openYear = yearOf(openingDate);
  if (year < openYear) return 0;
  if (year > openYear) return cfg.annualLimitCents;
  const activeMonths = 12 - monthOf(openingDate) + 1;
  return Math.round((cfg.annualLimitCents * activeMonths) / 12);
}

/** Limite máximo tolerado antes do desenquadramento retroativo. */
export function toleranceLimitFor(limitCents: Cents, toleranceRate: number): Cents {
  return Math.round(limitCents * (1 + toleranceRate));
}

/** Soma das receitas confirmadas do ano, opcionalmente até uma data (inclusive). */
export function accumulatedRevenue(
  transactions: ReadonlyArray<Transaction>,
  year: number,
  upTo?: ISODate,
): Cents {
  let total = 0;
  for (const t of transactions) {
    if (t.kind !== "receita" || t.status !== "confirmada") continue;
    if (yearOf(t.date) !== year) continue;
    if (upTo !== undefined && t.date > upTo) continue;
    total += t.amountCents;
  }
  return total;
}
