import type { Cents } from "./config";
import type { ISODate } from "./dates";

export type TransactionKind = "receita" | "despesa";

/**
 * - pendente: extraída pela IA, aguardando conferência do usuário
 * - confirmada: conferida pelo usuário; a única que entra nos cálculos
 * - cancelada: estorno, devolução ou nota cancelada; nunca soma
 */
export type TransactionStatus = "pendente" | "confirmada" | "cancelada";

/** Visão mínima de uma transação para o motor de regras (sem I/O). */
export interface Transaction {
  id: string;
  /** Data que conta para o limite (critério de emissão/recebimento: ver docs/mei-rules.md). */
  date: ISODate;
  amountCents: Cents;
  kind: TransactionKind;
  status: TransactionStatus;
}

export type RiskBand =
  | "ok"
  | "attention" // >= 80% do limite
  | "critical" // >= 90% do limite
  | "over_tolerance" // acima do limite, até +20%
  | "over_retroactive"; // acima de +20%
