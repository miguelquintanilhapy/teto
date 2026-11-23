import { daysBetween, formatISODate, toUTC, type ISODate } from "./dates";

/** Próximo vencimento do DAS (hoje conta, se hoje for o dia de vencimento). */
export function nextDasDueDate(today: ISODate, dueDay: number): ISODate {
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
    throw new RangeError("dueDay deve estar entre 1 e 28");
  }
  const t = new Date(toUTC(today));
  let year = t.getUTCFullYear();
  let month = t.getUTCMonth();
  if (t.getUTCDate() > dueDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return formatISODate(Date.UTC(year, month, dueDay));
}

export function daysUntilDas(today: ISODate, dueDay: number): number {
  return daysBetween(today, nextDasDueDate(today, dueDay));
}
