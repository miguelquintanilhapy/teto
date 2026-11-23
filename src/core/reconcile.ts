import type { Cents } from "./config";
import { daysBetween, type ISODate } from "./dates";

export interface Entry {
  id: string;
  date: ISODate;
  amountCents: Cents;
}

export interface Match {
  creditId: string;
  receiptId: string;
  dayDiff: number;
}

export interface ReconciliationResult {
  matches: Match[];
  /** Entradas no banco sem nota: possível receita não declarada. */
  unmatchedCredits: Entry[];
  /** Notas sem entrada correspondente no extrato. */
  unmatchedReceipts: Entry[];
}

/**
 * Cruza créditos do extrato com notas: mesmo valor, datas a até `windowDays`
 * de distância, pareamento um-para-um priorizando a data mais próxima.
 * Determinístico: empates são resolvidos pelo id.
 */
export function reconcile(
  credits: ReadonlyArray<Entry>,
  receipts: ReadonlyArray<Entry>,
  windowDays = 3,
): ReconciliationResult {
  const candidates: Array<Match & { creditIdx: number; receiptIdx: number }> = [];
  credits.forEach((c, creditIdx) => {
    receipts.forEach((r, receiptIdx) => {
      if (c.amountCents !== r.amountCents) return;
      const dayDiff = Math.abs(daysBetween(r.date, c.date));
      if (dayDiff <= windowDays) {
        candidates.push({ creditId: c.id, receiptId: r.id, dayDiff, creditIdx, receiptIdx });
      }
    });
  });
  candidates.sort(
    (a, b) =>
      a.dayDiff - b.dayDiff ||
      a.creditId.localeCompare(b.creditId) ||
      a.receiptId.localeCompare(b.receiptId),
  );

  const usedCredits = new Set<number>();
  const usedReceipts = new Set<number>();
  const matches: Match[] = [];
  for (const c of candidates) {
    if (usedCredits.has(c.creditIdx) || usedReceipts.has(c.receiptIdx)) continue;
    usedCredits.add(c.creditIdx);
    usedReceipts.add(c.receiptIdx);
    matches.push({ creditId: c.creditId, receiptId: c.receiptId, dayDiff: c.dayDiff });
  }

  return {
    matches,
    unmatchedCredits: credits.filter((_, i) => !usedCredits.has(i)),
    unmatchedReceipts: receipts.filter((_, i) => !usedReceipts.has(i)),
  };
}
