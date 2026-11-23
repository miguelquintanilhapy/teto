import type { Cents } from "./config";
import type { ISODate } from "./dates";

export type TransactionKind = "receita" | "despesa";

/** Visão mínima de uma transação para o motor de regras (sem I/O). */
export interface Transaction {
  id: string;
  date: ISODate;
  amountCents: Cents;
  kind: TransactionKind;
  /** Só transações confirmadas pelo usuário entram nos cálculos. */
  confirmed: boolean;
}

export type RiskBand =
  | "ok"
  | "attention" // >= 80% do limite
  | "critical" // >= 90% do limite
  | "over_tolerance" // acima do limite, até +20%
  | "over_retroactive"; // acima de +20%
