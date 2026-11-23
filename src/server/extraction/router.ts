import type { ISODate } from "@/core";
import { todayInSaoPaulo } from "@/server/clock";
import { InMemoryCooldownStore, type CooldownStore } from "./cooldown";
import {
  ProviderError,
  canHandle,
  type DocumentInput,
  type ProviderErrorKind,
  type VisionProvider,
} from "./provider";
import { QuotaExceededError, type QuotaGuard } from "./quota";
import { parseExtraction, type ExtractedReceipt } from "./schema";
import { checkBusinessRules } from "./validate";

export interface RouterOptions {
  /** Cadeia em ordem de preferência: do mais barato ao mais forte. */
  providers: ReadonlyArray<VisionProvider>;
  /** Tempo máximo por chamada a um provedor. */
  timeoutMs?: number;
  /** Orçamento total da extração, somando todos os provedores tentados. */
  totalBudgetMs?: number;
  /** Quanto tempo um provedor fica fora da rotação após 429/queda. */
  cooldownMs?: number;
  minConfidence?: number;
  /** Estado de cooldown compartilhável entre instâncias (Postgres em produção). */
  cooldownStore?: CooldownStore;
  /** Teto diário de extrações; sem ele não há limite. */
  quota?: QuotaGuard;
  /** Relógio e data injetáveis, para testes determinísticos. */
  now?: () => number;
  today?: () => ISODate;
}

export type AttemptOutcome =
  | "accepted"
  | "rejected"
  | "error"
  | "skipped_cooldown"
  | "skipped_capability"
  | "skipped_budget";

/** Registro de cada tentativa. Alimenta métricas, logs e o relatório de avaliação. */
export interface Attempt {
  providerId: string;
  outcome: AttemptOutcome;
  latencyMs: number;
  errorKind?: ProviderErrorKind;
  issues?: string[];
}

export interface ExtractionResult {
  /** `needs_review`: nenhum modelo passou na validação; mostrar ao usuário para corrigir. */
  status: "accepted" | "needs_review";
  data: ExtractedReceipt;
  issues: string[];
  providerId: string;
  attempts: Attempt[];
}

export class AllProvidersFailedError extends Error {
  constructor(readonly attempts: Attempt[]) {
    super("Nenhum provedor devolveu uma extração utilizável");
    this.name = "AllProvidersFailedError";
  }
}

const DEFAULTS = {
  timeoutMs: 20_000,
  totalBudgetMs: 25_000,
  cooldownMs: 60_000,
  minConfidence: 0.7,
} as const;

/**
 * Roteador em cadeia com dois gatilhos distintos:
 *  - failover: erro técnico (429, timeout, queda) → próximo provedor;
 *  - escalonamento: resposta recebida mas reprovada na validação → próximo provedor.
 * Provedores com 429 ou queda entram em cooldown (circuit breaker). Um orçamento
 * total de tempo impede que a cadeia estoure o limite da função serverless.
 */
export class ExtractionRouter {
  private readonly cooldown: CooldownStore;
  private readonly now: () => number;
  private readonly today: () => ISODate;

  constructor(private readonly opts: RouterOptions) {
    if (opts.providers.length === 0) throw new Error("Configure ao menos um provedor");
    this.cooldown = opts.cooldownStore ?? new InMemoryCooldownStore();
    this.now = opts.now ?? Date.now;
    this.today = opts.today ?? (() => todayInSaoPaulo(new Date()));
  }

  async extract(doc: DocumentInput): Promise<ExtractionResult> {
    const timeoutMs = this.opts.timeoutMs ?? DEFAULTS.timeoutMs;
    const totalBudgetMs = this.opts.totalBudgetMs ?? DEFAULTS.totalBudgetMs;
    const cooldownMs = this.opts.cooldownMs ?? DEFAULTS.cooldownMs;
    const minConfidence = this.opts.minConfidence ?? DEFAULTS.minConfidence;

    if (this.opts.quota && !(await this.opts.quota.tryConsume(this.today()))) {
      throw new QuotaExceededError();
    }

    const startedAll = this.now();
    const attempts: Attempt[] = [];
    let best: { data: ExtractedReceipt; issues: string[]; providerId: string } | null = null;

    for (const provider of this.opts.providers) {
      const started = this.now();

      if (!canHandle(provider, doc)) {
        attempts.push({ providerId: provider.id, outcome: "skipped_capability", latencyMs: 0 });
        continue;
      }

      const blockedUntil = await this.cooldown.blockedUntil(provider.id);
      if (blockedUntil !== null && blockedUntil > started) {
        attempts.push({ providerId: provider.id, outcome: "skipped_cooldown", latencyMs: 0 });
        continue;
      }

      const remaining = totalBudgetMs - (started - startedAll);
      if (remaining <= 0) {
        attempts.push({ providerId: provider.id, outcome: "skipped_budget", latencyMs: 0 });
        break;
      }

      let raw: unknown;
      try {
        raw = await withTimeout((signal) => provider.extract(doc, signal), Math.min(timeoutMs, remaining));
      } catch (err) {
        const e = toProviderError(err);
        if (e.kind === "rate_limit" || e.kind === "unavailable" || e.kind === "timeout") {
          await this.cooldown.block(provider.id, this.now() + (e.retryAfterMs ?? cooldownMs), e.kind);
        }
        attempts.push({ providerId: provider.id, outcome: "error", errorKind: e.kind, latencyMs: this.now() - started });
        continue;
      }

      const latencyMs = this.now() - started;
      const parsed = parseExtraction(raw);
      if (!parsed.ok) {
        attempts.push({ providerId: provider.id, outcome: "rejected", issues: parsed.issues, latencyMs });
        continue;
      }

      const issues = checkBusinessRules(parsed.data, { minConfidence, today: this.today() });
      if (issues.length === 0) {
        attempts.push({ providerId: provider.id, outcome: "accepted", latencyMs });
        return { status: "accepted", data: parsed.data, issues: [], providerId: provider.id, attempts };
      }
      attempts.push({ providerId: provider.id, outcome: "rejected", issues, latencyMs });
      if (best === null || issues.length < best.issues.length) {
        best = { data: parsed.data, issues, providerId: provider.id };
      }
    }

    if (best) return { status: "needs_review", ...best, attempts };
    throw new AllProvidersFailedError(attempts);
  }
}

function toProviderError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  return new ProviderError("unavailable", err instanceof Error ? err.message : String(err));
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ProviderError("timeout", `Sem resposta em ${ms} ms`));
    }, ms);
  });
  try {
    return await Promise.race([fn(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
