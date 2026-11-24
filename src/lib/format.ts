import type { Cents, ISODate } from "@/core";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Espaço inseparável: "R$" e o número nunca ficam em linhas diferentes. */
const NBSP = " ";

const brl = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const brlCents = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** R$ 60.000 (arredonda para reais inteiros). */
export function formatReais(cents: Cents): string {
  return `R$${NBSP}${brl.format(Math.round(cents / 100))}`;
}

/** R$ 1.280,00 (centavos sempre visíveis). */
export function formatMoney(cents: Cents): string {
  return `R$${NBSP}${brlCents.format(cents / 100)}`;
}

/** Só a parte dos centavos, com vírgula: ",00". Serve para o número grande do painel. */
export function centsPart(cents: Cents): string {
  return `,${String(Math.abs(cents % 100)).padStart(2, "0")}`;
}

/** Reais inteiros sem o símbolo: "60.000". */
export function wholeReais(cents: Cents): string {
  return brl.format(Math.trunc(cents / 100));
}

/** Percentual inteiro: 0.889 vira "89%". */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function parts(date: ISODate): { y: number; m: number; d: number } {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return { y, m, d };
}

/** 28 de dezembro. */
export function formatDayMonth(date: ISODate): string {
  const { m, d } = parts(date);
  return `${d}${d === 1 ? "º" : ""} de ${MESES[m - 1]}`;
}

/** 20 dez. */
export function formatShortDate(date: ISODate): string {
  const { m, d } = parts(date);
  return `${d} ${MESES_CURTOS[m - 1]}`;
}

/** 22 nov 2026. */
export function formatFullShortDate(date: ISODate): string {
  const { y } = parts(date);
  return `${formatShortDate(date)} ${y}`;
}

/** Inicial do mês para o eixo do gráfico: M, A, M, J... */
export function monthInitial(monthIndex: number): string {
  return MESES[monthIndex]!.charAt(0).toUpperCase();
}

export function monthName(monthIndex: number): string {
  return MESES[monthIndex]!;
}

/** Máscara de privacidade: mostra só o miolo do CPF e esconde o resto. */
export function maskTaxId(taxId: string | null): string {
  if (!taxId) return "não identificado";
  const d = taxId.replace(/\D/g, "");
  if (d.length === 11) return `CPF •••.${d.slice(3, 6)}.${d.slice(6, 9)}-••`;
  if (d.length === 14) return `CNPJ ${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/••••-••`;
  return "documento inválido";
}
