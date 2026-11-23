import type { ISODate } from "@/core";

/**
 * Teto diário global de extrações. Protege a cota gratuita compartilhada: ao
 * atingir o limite, o sistema degrada para entrada manual e notas em cache.
 * Em produção a implementação usa a tabela daily_quota (atômica no Postgres).
 */
export interface QuotaGuard {
  /** Consome uma unidade do dia. Devolve false se o teto já foi atingido. */
  tryConsume(day: ISODate): Promise<boolean>;
}

export class QuotaExceededError extends Error {
  constructor() {
    super("Teto diário de extrações atingido");
    this.name = "QuotaExceededError";
  }
}

export class InMemoryQuotaGuard implements QuotaGuard {
  private readonly used = new Map<ISODate, number>();

  constructor(private readonly limitPerDay: number) {}

  async tryConsume(day: ISODate): Promise<boolean> {
    const n = this.used.get(day) ?? 0;
    if (n >= this.limitPerDay) return false;
    this.used.set(day, n + 1);
    return true;
  }
}
