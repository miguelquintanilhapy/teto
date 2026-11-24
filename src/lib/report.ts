import { monthOf, type Cents } from "@/core";

export interface ReportTransaction {
  date: string;
  amountCents: Cents;
  kind: "receita" | "despesa";
  source: "nota" | "pix" | "manual";
  status: "pendente" | "confirmada" | "cancelada";
  description: string;
}

export interface MonthRow {
  /** 0 = janeiro. */
  month: number;
  revenueCents: Cents;
  revenueCount: number;
  expenseCents: Cents;
}

export interface YearReport {
  year: number;
  months: MonthRow[];
  revenueCents: Cents;
  expenseCents: Cents;
  cancelledCount: number;
  pendingCount: number;
}

/** Resumo do ano. Só lançamento confirmado entra nas somas, como no cálculo do limite. */
export function buildYearReport(transactions: ReadonlyArray<ReportTransaction>, year: number): YearReport {
  const months: MonthRow[] = Array.from({ length: 12 }, (_, month) => ({ month, revenueCents: 0, revenueCount: 0, expenseCents: 0 }));
  let cancelledCount = 0;
  let pendingCount = 0;
  for (const t of transactions) {
    if (!t.date.startsWith(`${year}-`)) continue;
    if (t.status === "cancelada") cancelledCount += 1;
    if (t.status === "pendente") pendingCount += 1;
    if (t.status !== "confirmada") continue;
    const row = months[monthOf(t.date) - 1]!;
    if (t.kind === "receita") {
      row.revenueCents += t.amountCents;
      row.revenueCount += 1;
    } else row.expenseCents += t.amountCents;
  }
  return {
    year,
    months,
    revenueCents: months.reduce((s, m) => s + m.revenueCents, 0),
    expenseCents: months.reduce((s, m) => s + m.expenseCents, 0),
    cancelledCount,
    pendingCount,
  };
}

/**
 * Protege contra injeção de fórmula: uma célula de planilha que começa com = + - @ (ou tab/CR)
 * seria executada pelo Excel ou Google Planilhas. O texto livre da nota vem de fora, então
 * ganha um apóstrofo na frente. Números nossos (com sinal) não passam por aqui.
 */
export function csvText(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const money = (cents: Cents) => (cents / 100).toFixed(2).replace(".", ",");

/** CSV dos lançamentos do ano, com ponto e vírgula e vírgula decimal (abre direto no Excel brasileiro). */
export function transactionsToCsv(transactions: ReadonlyArray<ReportTransaction>): string {
  const header = ["Data", "Tipo", "Valor (R$)", "Situação", "Origem", "Descrição"];
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => [t.date, t.kind === "receita" ? "Receita" : "Despesa", money(t.amountCents), t.status, t.source, csvText(t.description)].join(";"));
  // BOM para o Excel reconhecer UTF-8 (acentos).
  return `﻿${header.join(";")}\r\n${rows.join("\r\n")}${rows.length > 0 ? "\r\n" : ""}`;
}
