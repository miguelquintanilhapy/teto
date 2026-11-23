/**
 * Porta do estado de cooldown dos provedores. Em serverless, memória de
 * instância não vale entre requisições: em produção a implementação grava no
 * Postgres (tabela provider_cooldowns). A versão em memória serve a testes e
 * ao desenvolvimento local.
 */
export interface CooldownStore {
  /** Instante (ms) até o qual o provedor está bloqueado, ou null. */
  blockedUntil(providerId: string): Promise<number | null>;
  block(providerId: string, untilMs: number, reason: string): Promise<void>;
}

export class InMemoryCooldownStore implements CooldownStore {
  private readonly entries = new Map<string, number>();

  async blockedUntil(providerId: string): Promise<number | null> {
    return this.entries.get(providerId) ?? null;
  }

  async block(providerId: string, untilMs: number): Promise<void> {
    this.entries.set(providerId, untilMs);
  }
}
