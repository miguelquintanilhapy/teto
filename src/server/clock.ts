import type { ISODate } from "@/core";

/**
 * Porta do relógio. O núcleo nunca lê a hora do sistema: quem calcula "hoje"
 * é a borda, sempre no fuso de Brasília, e passa a data por parâmetro.
 */
export interface Clock {
  nowMs(): number;
  /** Data de hoje (YYYY-MM-DD) em America/Sao_Paulo. */
  today(): ISODate;
}

const SAO_PAULO = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Evita o erro clássico de o dia virar às 21h locais por causa do UTC. */
export function todayInSaoPaulo(now: Date): ISODate {
  return SAO_PAULO.format(now);
}

export const systemClock: Clock = {
  nowMs: () => Date.now(),
  today: () => todayInSaoPaulo(new Date()),
};

/** Relógio fixo para testes. */
export function fixedClock(isoInstant: string): Clock {
  const ms = Date.parse(isoInstant);
  return { nowMs: () => ms, today: () => todayInSaoPaulo(new Date(ms)) };
}
