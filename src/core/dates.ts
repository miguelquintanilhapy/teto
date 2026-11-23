/**
 * Datas como strings ISO (YYYY-MM-DD), sempre calculadas em UTC.
 * Evita bugs de fuso horário: "2026-03-01" é o mesmo dia em qualquer máquina.
 */
export type ISODate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export function toUTC(date: ISODate): number {
  const m = ISO_RE.exec(date);
  if (!m) throw new RangeError(`Data inválida: "${date}" (esperado YYYY-MM-DD)`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) {
    throw new RangeError(`Data inexistente: "${date}"`);
  }
  return ms;
}

export function isValidISODate(date: string): boolean {
  try {
    toUTC(date);
    return true;
  } catch {
    return false;
  }
}

export function formatISODate(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function yearOf(date: ISODate): number {
  return new Date(toUTC(date)).getUTCFullYear();
}

export function monthOf(date: ISODate): number {
  return new Date(toUTC(date)).getUTCMonth() + 1;
}

/** Dias de `from` até `to` (positivo se `to` é depois). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
}

export function addDays(date: ISODate, days: number): ISODate {
  return formatISODate(toUTC(date) + days * DAY_MS);
}

export const startOfYear = (year: number): ISODate => `${year}-01-01`;
export const endOfYear = (year: number): ISODate => `${year}-12-31`;
