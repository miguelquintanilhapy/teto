import type { Cents } from "./config";
import { monthOf, yearOf, type ISODate } from "./dates";
import type { Transaction } from "./types";

/**
 * Receita confirmada de cada mês do ano (índice 0 = janeiro), até `upTo` (inclusive).
 * Mesmo critério de `accumulatedRevenue`: só receita confirmada conta.
 */
export function monthlyRevenue(
  transactions: ReadonlyArray<Transaction>,
  year: number,
  upTo?: ISODate,
): Cents[] {
  const months: Cents[] = Array.from({ length: 12 }, () => 0);
  for (const t of transactions) {
    if (t.kind !== "receita" || t.status !== "confirmada") continue;
    if (yearOf(t.date) !== year) continue;
    if (upTo !== undefined && t.date > upTo) continue;
    months[monthOf(t.date) - 1]! += t.amountCents;
  }
  return months;
}

/** Soma de três em três meses (T1 a T4) a partir da série mensal. */
export function quarterlyRevenue(months: ReadonlyArray<Cents>): Cents[] {
  return [0, 1, 2, 3].map((q) => months.slice(q * 3, q * 3 + 3).reduce((s, v) => s + v, 0));
}
