import type { Cents, ISODate } from "@/core";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Espaço inseparável: "R$" e o número nunca ficam em linhas diferentes. */
const NBSP = " ";

const brl = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const brlCents = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * R$ 60.000: reais inteiros, sempre por TRUNCAMENTO, como `wholeReais`. Uma regra só em todo o app: antes, o painel
 * truncava (R$ 56.180) e o gráfico arredondava (R$ 56.181), e o mesmo faturamento aparecia com dois números.
 * Truncar também nunca mostra folga a mais ("ainda cabem").
 */
export function formatReais(cents: Cents): string {
  return `R$${NBSP}${brl.format(Math.trunc(cents / 100))}`;
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

/** Valor curto para rótulos de gráfico: 6700 reais viram "6,7 mil"; abaixo de mil, o valor inteiro. */
export function formatCompact(cents: Cents): string {
  const reais = Math.trunc(cents / 100);
  if (reais < 1000) return String(reais);
  const mil = reais / 1000;
  return `${mil.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
}

/**
 * Percentual inteiro, truncado como os reais: 0.889 vira "88%". Arredondar mostrava "90%" com a faixa ainda em
 * "Atenção" (o Crítico começa em 90%): o número na tela só chega a um limiar quando ele foi cruzado de fato.
 * O 1e-9 protege da conta em ponto flutuante (0.29 * 100 dá 28,999...).
 */
export function formatPercent(ratio: number): string {
  return `${Math.floor(ratio * 100 + 1e-9)}%`;
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

/** "mar", "abr": rótulo do eixo do gráfico, sem a ambiguidade das iniciais. */
export function monthShort(monthIndex: number): string {
  return MESES_CURTOS[monthIndex]!;
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

/** Máscara de CNPJ enquanto se digita: "11222333000181" vira "11.222.333/0001-81". */
export function formatCnpjInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 14);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8), d.slice(8, 12), d.slice(12, 14)];
  let out = parts[0]!;
  if (parts[1]) out += `.${parts[1]}`;
  if (parts[2]) out += `.${parts[2]}`;
  if (parts[3]) out += `/${parts[3]}`;
  if (parts[4]) out += `-${parts[4]}`;
  return out;
}

/** "marta@example.com" vira "m•••@example.com": reconhece o endereço sem expô-lo por inteiro. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "não informado";
  return `${email[0]}•••${email.slice(at)}`;
}
