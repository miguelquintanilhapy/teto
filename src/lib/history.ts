import { formatMoney, monthName } from "./format";

/** O mínimo de um lançamento que o histórico precisa para filtrar, buscar e somar. */
export interface HistoryItem {
  date: string;
  amountCents: number;
  kind: "receita" | "despesa";
  status: "pendente" | "confirmada" | "cancelada";
  description: string;
  counterparty: string;
}

/**
 * Os meses que o histórico deixa navegar, do mais antigo ao mais novo ("2026-03"): de janeiro (ou do mês de
 * abertura, se a empresa abriu neste ano) até o mês de hoje. O histórico só carrega o ano corrente.
 */
export function historyMonths(today: string, openingDate: string | null): string[] {
  const year = Number(today.slice(0, 4));
  const last = Number(today.slice(5, 7));
  const first = openingDate && Number(openingDate.slice(0, 4)) === year ? Number(openingDate.slice(5, 7)) : 1;
  const months: string[] = [];
  for (let m = Math.min(first, last); m <= last; m++) months.push(`${year}-${String(m).padStart(2, "0")}`);
  return months;
}

/** "Novembro de 2026". */
export function monthTitle(month: string): string {
  const name = monthName(Number(month.slice(5, 7)) - 1);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${month.slice(0, 4)}`;
}

/** Quanto entrou e saiu no conjunto. Cancelados não contam, como no limite. */
export function totals(items: ReadonlyArray<HistoryItem>): { incomeCents: number; expenseCents: number } {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const t of items) {
    if (t.status === "cancelada") continue;
    if (t.kind === "receita") incomeCents += t.amountCents;
    else expenseCents += t.amountCents;
  }
  return { incomeCents, expenseCents };
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ /g, " ")
    .trim();

/**
 * Busca por descrição, pelo documento da outra parte ou pelo valor ("3015", "3.015", "3.015,00" ou "150,5"),
 * sem diferenciar maiúsculas nem acentos. Busca vazia devolve tudo.
 */
export function searchHistory<T extends HistoryItem>(items: ReadonlyArray<T>, query: string): T[] {
  const q = normalize(query);
  if (q === "") return [...items];
  return items.filter((t) => {
    const money = formatMoney(t.amountCents).replace(/[^\d.,]/g, ""); // "3.015,00"
    // O documento chega mascarado ("CNPJ 11.222.333/••••-••"): os dígitos à mostra também valem sem pontuação.
    const docDigits = t.counterparty.replace(/\D/g, "");
    const haystack = normalize(`${t.description} ${t.counterparty} ${docDigits} ${money} ${money.replace(/\./g, "")}`);
    return haystack.includes(q);
  });
}

/** "Bolo decorado" em vez de "bolo decorado"; vazio continua vazio. */
export function displayTitle(description: string): string {
  const d = description.trim();
  return d === "" ? "" : `${d.charAt(0).toUpperCase()}${d.slice(1)}`;
}

/** Agrupa por dia, na ordem em que os itens chegam (o histórico e o extrato já vêm do mais novo ao mais antigo). */
export function groupByDay<T extends { date: string }>(items: ReadonlyArray<T>): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  for (const t of items) groups.set(t.date, [...(groups.get(t.date) ?? []), t]);
  return [...groups.entries()];
}
