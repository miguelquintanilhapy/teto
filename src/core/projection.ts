import type { Cents, MeiConfig } from "./config";
import {
  addDays,
  daysBetween,
  endOfYear,
  startOfYear,
  yearOf,
  type ISODate,
} from "./dates";
import { accumulatedRevenue, toleranceLimitFor } from "./limits";
import type { Transaction } from "./types";

export type Crossing =
  | { status: "reached" }
  | { status: "projected"; date: ISODate }
  | { status: "not_this_year" };

export interface YearProjection {
  accumulatedCents: Cents;
  /** Receita média por dia desde o início da contagem. */
  dailyRateCents: number;
  /** Receita total esperada no ano se o ritmo atual se mantiver. */
  projectedYearEndCents: Cents;
  /** Quando o limite anual será ultrapassado. */
  limitCrossing: Crossing;
  /** Quando a tolerância de 20% será ultrapassada (desenquadramento retroativo). */
  toleranceCrossing: Crossing;
}

function crossing(
  accumulated: Cents,
  target: Cents,
  dailyRate: number,
  today: ISODate,
  yearEnd: ISODate,
): Crossing {
  if (accumulated > target) return { status: "reached" };
  if (dailyRate <= 0) return { status: "not_this_year" };
  const daysToGo = Math.ceil((target - accumulated) / dailyRate) || 1;
  const date = addDays(today, daysToGo);
  return date > yearEnd ? { status: "not_this_year" } : { status: "projected", date };
}

/**
 * Projeção linear: ritmo médio diário desde o início da contagem
 * (1º de janeiro, ou a data de abertura no ano de abertura).
 */
export function projectYear(input: {
  transactions: ReadonlyArray<Transaction>;
  today: ISODate;
  openingDate: ISODate | null;
  limitCents: Cents;
  cfg: Pick<MeiConfig, "toleranceRate">;
}): YearProjection {
  const { transactions, today, openingDate, limitCents, cfg } = input;
  const year = yearOf(today);
  const yearStart = startOfYear(year);
  const yearEnd = endOfYear(year);
  const start =
    openingDate !== null && yearOf(openingDate) === year && openingDate > yearStart
      ? openingDate
      : yearStart;

  const accumulated = accumulatedRevenue(transactions, year, today);
  const daysElapsed = Math.max(1, daysBetween(start, today) + 1);
  const totalDays = daysBetween(start, yearEnd) + 1;
  const dailyRate = accumulated / daysElapsed;

  return {
    accumulatedCents: accumulated,
    dailyRateCents: dailyRate,
    projectedYearEndCents: Math.round(dailyRate * totalDays),
    limitCrossing: crossing(accumulated, limitCents, dailyRate, today, yearEnd),
    toleranceCrossing: crossing(
      accumulated,
      toleranceLimitFor(limitCents, cfg.toleranceRate),
      dailyRate,
      today,
      yearEnd,
    ),
  };
}
