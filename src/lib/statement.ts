import { isValidISODate, type Cents, type ISODate } from "@/core";

/** Uma linha do extrato. Valor com sinal: crédito positivo, débito negativo. */
export interface StatementEntry {
  id: string;
  date: ISODate;
  amountCents: Cents;
  /** Quem pagou ou recebeu, como o banco escreve ("origem / destino", "descrição", "histórico"). */
  description: string;
  /** O tipo que o banco dá à linha ("Pix recebido", "Dinheiro resgatado"), quando o extrato tem essa coluna. */
  type: string;
}

export interface ParsedStatement {
  entries: StatementEntry[];
  /** Linhas que não deu para ler (data ou valor inválido). */
  skipped: number;
  /** Problema que impede a leitura do arquivo inteiro. */
  error: string | null;
}

const MAX_LINES = 5_000;

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Separa uma linha CSV respeitando aspas ("a;b" fica inteiro e "" vira "). */
export function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** "15/10/2026", "15/10/26" ou "2026-10-15" viram "2026-10-15"; qualquer outra coisa, null. */
export function parseStatementDate(raw: string): ISODate | null {
  const s = raw.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return isValidISODate(`${m[1]}-${m[2]}-${m[3]}`) ? `${m[1]}-${m[2]}-${m[3]}` : null;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s);
  if (!m) return null;
  const year = m[3]!.length === 2 ? `20${m[3]}` : m[3]!;
  const iso = `${year}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return isValidISODate(iso) ? iso : null;
}

/**
 * "1.234,56", "-1.234,56", "R$ 1.234,56", "1234.56" e "(1.234,56)" viram centavos com sinal.
 * Decide o separador decimal pelo último ponto ou vírgula, como os bancos brasileiros exportam.
 */
export function parseStatementAmount(raw: string): Cents | null {
  // Alguns bancos (o PicPay, por exemplo) escrevem o negativo com o sinal de menos tipográfico (−) ou um traço.
  let s = raw
    .trim()
    .replace(/[−‒–—﹣－]/g, "-")
    .replace(/\s/g, "")
    .replace(/^R\$/i, "")
    .replace(/R\$/i, "");
  if (s === "") return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith("+")) s = s.slice(1);
  if (s.endsWith("-")) {
    negative = !negative;
    s = s.slice(0, -1);
  }
  if (!/^[\d.,]+$/.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const decimalSep = lastComma > lastDot ? "," : lastDot > lastComma ? "." : null;
  let intPart = s;
  let frac = "";
  if (decimalSep) {
    const i = s.lastIndexOf(decimalSep);
    const tail = s.slice(i + 1);
    // "1.234" sem centavos (ponto de milhar) não é decimal.
    if (tail.length > 0 && tail.length <= 2) {
      intPart = s.slice(0, i);
      frac = tail;
    }
  }
  intPart = intPart.replace(/[.,]/g, "");
  if (intPart === "" && frac === "") return null;
  const cents = Number(intPart || "0") * 100 + Number(frac.padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

const DATE_COLS = ["data", "date", "data lancamento", "data de lancamento", "data movimento"];
const AMOUNT_COLS = ["valor", "amount", "quantia", "valor (r$)", "valor r$"];
const DESC_COLS = [
  "descricao",
  "description",
  "historico",
  "origem / destino",
  "origem/destino",
  "favorecido",
  "pagador",
  "contraparte",
  "title",
  "lancamento",
  "identificacao",
  "memo",
  "origem",
  "destino",
  "nome",
];
const TYPE_COLS = ["tipo", "tipo de transacao", "tipo de lancamento", "natureza", "categoria"];

/**
 * Dinheiro do próprio dono que só muda de lugar: resgate de cofrinho ou caixinha, aplicação, rendimento,
 * transferência entre contas, estorno, reembolso. Não é venda, então não deve aparecer como "entrada sem nota".
 */
const OWN_MOVEMENT = /(resgat|cofrinho|caixinha|guardad|aplicac|investiment|rendiment|entre contas|mesma titularidade|estorn|devoluc|reembolso|cashback)/;

export function isOwnMovement(e: Pick<StatementEntry, "type" | "description">): boolean {
  return OWN_MOVEMENT.test(norm(`${e.type} ${e.description}`));
}

function findCol(header: string[], names: string[]): number {
  const h = header.map(norm);
  for (const n of names) {
    const i = h.indexOf(n);
    if (i >= 0) return i;
  }
  return h.findIndex((c) => names.some((n) => c.startsWith(n)));
}

/** Lê um extrato CSV exportado pelo banco. Não envia nada ao servidor: roda no navegador. */
export function parseStatementCsv(text: string): ParsedStatement {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { entries: [], skipped: 0, error: "O arquivo está vazio ou só tem o cabeçalho." };
  if (lines.length > MAX_LINES) return { entries: [], skipped: 0, error: `O arquivo tem mais de ${MAX_LINES} linhas. Exporte um período menor.` };

  // O cabeçalho pode não ser a primeira linha (alguns bancos põem o nome da conta antes).
  let headerIdx = -1;
  let sep = ";";
  let cols = { date: -1, amount: -1, desc: -1, type: -1 };
  for (let i = 0; i < Math.min(lines.length, 10) && headerIdx < 0; i++) {
    for (const candidate of [";", ",", "\t"]) {
      const header = splitCsvLine(lines[i]!, candidate);
      const date = findCol(header, DATE_COLS);
      const amount = findCol(header, AMOUNT_COLS);
      if (date >= 0 && amount >= 0) {
        headerIdx = i;
        sep = candidate;
        cols = { date, amount, desc: findCol(header, DESC_COLS), type: findCol(header, TYPE_COLS) };
        break;
      }
    }
  }
  if (headerIdx < 0) {
    return { entries: [], skipped: 0, error: "Não achei as colunas de data e valor. Exporte o extrato em CSV com cabeçalho." };
  }

  const entries: StatementEntry[] = [];
  let skipped = 0;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!, sep);
    const date = parseStatementDate(cells[cols.date] ?? "");
    const amountCents = parseStatementAmount(cells[cols.amount] ?? "");
    if (!date || amountCents === null || amountCents === 0) {
      skipped += 1;
      continue;
    }
    entries.push({
      id: `l${i}`,
      date,
      amountCents,
      description: (cols.desc >= 0 ? cells[cols.desc] ?? "" : "").slice(0, 300),
      type: (cols.type >= 0 ? cells[cols.type] ?? "" : "").slice(0, 80),
    });
  }
  if (entries.length === 0) return { entries, skipped, error: "Nenhuma linha com data e valor válidos." };
  return { entries, skipped, error: null };
}
