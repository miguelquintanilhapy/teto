import { addDays, reconcile, type Cents, type Entry, type ISODate } from "@/core";
import { isOwnMovement, type StatementEntry } from "./statement";

export interface ReceiptLike {
  id: string;
  date: ISODate;
  amountCents: Cents;
  description: string;
}

export interface ReconciliationView {
  creditCount: number;
  creditTotalCents: Cents;
  matched: Array<{ credit: StatementEntry; receipt: ReceiptLike; dayDiff: number }>;
  /** Entradas no banco sem nota: possível receita ainda não lançada. */
  unmatchedCredits: StatementEntry[];
  /** Receitas lançadas que não aparecem como entrada no extrato do período. */
  unmatchedReceipts: ReceiptLike[];
  unmatchedCreditsTotalCents: Cents;
  /** Entradas que são dinheiro do próprio dono mudando de lugar (resgate de cofrinho, estorno...): ficam de fora. */
  ownMovementCount: number;
  debitCount: number;
  /** Entradas que o usuário marcou como "não é receita": saem da lista. */
  dismissedCount: number;
  /** Primeiro e último dia do extrato, para dizer o período que ele cobre. */
  period: { first: ISODate; last: ISODate } | null;
}

/**
 * Cruza as entradas do extrato com as receitas confirmadas. Só olha o período que o extrato cobre,
 * para não acusar "nota sem entrada" de meses que o arquivo nem tem. A regra de casamento é do núcleo.
 */
export function reconcileStatement(
  entries: ReadonlyArray<StatementEntry>,
  receipts: ReadonlyArray<ReceiptLike>,
  windowDays = 3,
  dismissed: ReadonlySet<string> = new Set(),
): ReconciliationView {
  const credits = entries.filter((e) => e.amountCents > 0 && !isOwnMovement(e));
  const ownMovementCount = entries.filter((e) => e.amountCents > 0 && isOwnMovement(e)).length;
  const debitCount = entries.filter((e) => e.amountCents < 0).length;
  const dates = credits.map((c) => c.date).sort();
  // A nota pode ter sido emitida alguns dias antes ou depois da entrada: a janela de casamento entra no período.
  const first = dates[0];
  const last = dates[dates.length - 1];
  const inPeriod = first && last ? receipts.filter((r) => r.date >= addDays(first, -windowDays) && r.date <= addDays(last, windowDays)) : [];

  const creditEntries: Entry[] = credits.map((c) => ({ id: c.id, date: c.date, amountCents: c.amountCents }));
  const receiptEntries: Entry[] = inPeriod.map((r) => ({ id: r.id, date: r.date, amountCents: r.amountCents }));
  const result = reconcile(creditEntries, receiptEntries, windowDays);

  const creditById = new Map(credits.map((c) => [c.id, c]));
  const receiptById = new Map(inPeriod.map((r) => [r.id, r]));
  const stillOpen = result.unmatchedCredits.map((e) => creditById.get(e.id)!);
  const unmatchedCredits = stillOpen.filter((c) => !dismissed.has(c.id));
  const allDates = entries.map((e) => e.date).sort();

  return {
    creditCount: credits.length,
    creditTotalCents: credits.reduce((s, c) => s + c.amountCents, 0),
    matched: result.matches.map((m) => ({ credit: creditById.get(m.creditId)!, receipt: receiptById.get(m.receiptId)!, dayDiff: m.dayDiff })),
    unmatchedCredits,
    unmatchedReceipts: result.unmatchedReceipts.map((e) => receiptById.get(e.id)!),
    unmatchedCreditsTotalCents: unmatchedCredits.reduce((s, c) => s + c.amountCents, 0),
    ownMovementCount,
    debitCount,
    dismissedCount: stillOpen.length - unmatchedCredits.length,
    period: allDates.length > 0 ? { first: allDates[0]!, last: allDates[allDates.length - 1]! } : null,
  };
}

/** Parâmetros de /lancar para lançar uma entrada do extrato. */
export function launchHref(credit: Pick<StatementEntry, "date" | "amountCents" | "description">): string {
  const q = new URLSearchParams({ valor: String(credit.amountCents), data: credit.date, desc: credit.description.slice(0, 120) });
  return `/lancar?${q.toString()}`;
}

/** Lê os parâmetros de /lancar com validação: nada vem do link sem passar por aqui. */
export function readLaunchParams(get: (k: string) => string | null, today: ISODate): { amountCents: Cents; date: string; description: string } {
  const valor = Number(get("valor"));
  const amountCents = Number.isSafeInteger(valor) && valor > 0 && valor <= 1_000_000_000 ? valor : 0;
  const data = get("data") ?? "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(data) && data <= today ? data : "";
  const description = (get("desc") ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 300);
  return { amountCents, date, description };
}
