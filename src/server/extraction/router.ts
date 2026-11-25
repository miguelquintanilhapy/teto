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
  /** Cooldown quando o provedor responde "indisponível" (padrão: 90 s). */
  unavailableCooldownMs?: number;
  /**
   * Se o provedor em andamento passa deste tempo sem responder, o PRÓXIMO da cadeia é disparado em paralelo
   * (sem cancelar o primeiro). Quem devolver uma extração aceita primeiro vence e cancela o outro. Os modelos
   * gratuitos variam de 2 s a 30 s para a mesma nota; esperar o primeiro morrer gastava o orçamento.
   * `Infinity` desliga e deixa a cadeia estritamente sequencial (usado no eval).
   */
  hedgeAfterMs?: number;
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
  | "cancelled"
  | "skipped_cooldown"
  | "skipped_capability"
  | "skipped_budget";

/** Registro de cada tentativa. Alimenta métricas, logs e o relatório de avaliação. */
export interface Attempt {
  providerId: string;
  outcome: AttemptOutcome;
  latencyMs: number;
  /** Quando a tentativa começou, em ms desde o início da extração (tentativas em paralelo se sobrepõem). */
  startOffsetMs?: number;
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
  /** Provedores gratuitos variam muito: o mesmo modelo leva de 2 s a 10 s para a mesma nota. */
  timeoutMs: 25_000,
  totalBudgetMs: 40_000,
  /** Cooldown de 429 e de timeout. */
  cooldownMs: 60_000,
  /**
   * Cooldown de "indisponível" (503, alta demanda): fica fora mais tempo que o de 429, mas não muito: o 503
   * volta em ~2 s, então errar de novo custa pouco, e quem foi pulado ainda é tentado como último recurso.
   */
  unavailableCooldownMs: 90_000,
  /** A mediana dos modelos saudáveis é de 2 a 4 s; passou disso, vale ter um segundo na corrida. */
  hedgeAfterMs: 7_000,
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

  /**
   * Consome a cota do dia. Se o banco da cota estiver fora do ar, libera a
   * extração (fail-open): o teto existe para poupar a cota gratuita, e uma falha
   * dele não pode derrubar o produto inteiro.
   */
  private async consumeQuota(quota: QuotaGuard): Promise<boolean> {
    try {
      return await quota.tryConsume(this.today());
    } catch {
      return true;
    }
  }

  async extract(doc: DocumentInput): Promise<ExtractionResult> {
    const timeoutMs = this.opts.timeoutMs ?? DEFAULTS.timeoutMs;
    const totalBudgetMs = this.opts.totalBudgetMs ?? DEFAULTS.totalBudgetMs;
    const cooldownMs = this.opts.cooldownMs ?? DEFAULTS.cooldownMs;
    const unavailableCooldownMs = this.opts.unavailableCooldownMs ?? DEFAULTS.unavailableCooldownMs;
    const hedgeAfterMs = this.opts.hedgeAfterMs ?? DEFAULTS.hedgeAfterMs;
    const minConfidence = this.opts.minConfidence ?? DEFAULTS.minConfidence;

    // Cota e cooldown de todos os provedores são consultas independentes: juntas custam uma ida e volta ao banco,
    // e não uma por provedor, em fila. (Se o banco do cooldown falhar, segue sem ele.)
    const [quotaOk, blockedList] = await Promise.all([
      this.opts.quota ? this.consumeQuota(this.opts.quota) : Promise.resolve(true),
      Promise.all(this.opts.providers.map((p) => this.cooldown.blockedUntil(p.id).catch(() => null))),
    ]);
    if (!quotaOk) throw new QuotaExceededError();
    const blockedUntilById = new Map(this.opts.providers.map((p, i) => [p.id, blockedList[i] ?? null] as const));

    const startedAll = this.now();
    const attempts: Attempt[] = [];
    let best: { data: ExtractedReceipt; issues: string[]; providerId: string } | null = null;

    // Quem ainda não foi tentado, na ordem da cadeia, e quem está em andamento agora.
    const queue = [...this.opts.providers];
    // Quem foi pulado só por estar em cooldown: se ninguém for aceito, volta à fila como último recurso.
    const deferred: Array<{ provider: VisionProvider; until: number; skip: Attempt }> = [];
    let ignoreCooldown = false;
    const retried = new Map<string, Attempt>(); // provedor -> o registro de "pulado" que sai quando ele é retentado
    const flights = new Map<number, Flight>();
    let nextId = 0;
    let lastLaunch = startedAll;

    /** Dispara o próximo provedor que pode ser usado. Devolve falso se a fila acabou sem disparar nada. */
    const launchNext = async (): Promise<boolean> => {
      while (queue.length > 0) {
        const provider = queue.shift()!;
        const started = this.now();
        const offset = started - startedAll;

        if (!canHandle(provider, doc)) {
          attempts.push({ providerId: provider.id, outcome: "skipped_capability", latencyMs: 0, startOffsetMs: offset });
          continue;
        }

        const blockedUntil = ignoreCooldown ? null : (blockedUntilById.get(provider.id) ?? null);
        if (blockedUntil !== null && blockedUntil > started) {
          const skip: Attempt = { providerId: provider.id, outcome: "skipped_cooldown", latencyMs: 0, startOffsetMs: offset };
          attempts.push(skip);
          deferred.push({ provider, until: blockedUntil, skip });
          continue;
        }

        const remaining = totalBudgetMs - offset;
        if (remaining <= 0) {
          attempts.push({ providerId: provider.id, outcome: "skipped_budget", latencyMs: 0, startOffsetMs: offset });
          queue.length = 0; // sem orçamento, ninguém mais entra
          deferred.length = 0;
          return false;
        }

        const skipped = retried.get(provider.id);
        if (skipped) {
          const i = attempts.indexOf(skipped);
          if (i >= 0) attempts.splice(i, 1);
          retried.delete(provider.id);
        }

        const id = nextId++;
        const controller = new AbortController();
        const state = { cancelled: false };
        const flight: Flight = {
          id,
          provider,
          controller,
          state,
          offset,
          promise: this.runAttempt(provider, doc, controller, state, Math.min(timeoutMs, remaining), started, {
            minConfidence,
            cooldownMs,
            unavailableCooldownMs,
          }).then((settled) => ({ id, settled })),
        };
        flights.set(id, flight);
        lastLaunch = started;
        return true;
      }
      return false;
    };

    /** Cancela quem ficou para trás, sem tratar isso como falha do provedor (não gera cooldown). */
    const cancelRest = () => {
      for (const f of flights.values()) {
        f.state.cancelled = true;
        f.controller.abort();
        attempts.push({ providerId: f.provider.id, outcome: "cancelled", latencyMs: this.now() - startedAll - f.offset, startOffsetMs: f.offset });
      }
      flights.clear();
    };

    await launchNext();

    for (;;) {
      while (flights.size > 0) {
        // Se ainda há provedores na fila, o próximo entra na corrida quando o último disparado passa do tempo.
        let hedgeTimer: ReturnType<typeof setTimeout> | undefined;
        const racers: Array<Promise<{ id: number; settled: Settled } | "hedge">> = [...flights.values()].map((f) => f.promise);
        if (queue.length > 0 && Number.isFinite(hedgeAfterMs)) {
          const wait = Math.max(0, hedgeAfterMs - (this.now() - lastLaunch));
          racers.push(new Promise<"hedge">((resolve) => (hedgeTimer = setTimeout(() => resolve("hedge"), wait))));
        }
        const event = await Promise.race(racers);
        clearTimeout(hedgeTimer);

        if (event === "hedge") {
          await launchNext();
          continue;
        }

        const flight = flights.get(event.id);
        if (!flight) continue;
        flights.delete(event.id);
        const settled = event.settled;
        const base = { providerId: flight.provider.id, latencyMs: settled.latencyMs, startOffsetMs: flight.offset };

        if (settled.kind === "error") {
          attempts.push({ ...base, outcome: "error", errorKind: settled.errorKind });
        } else if (settled.kind === "invalid") {
          attempts.push({ ...base, outcome: "rejected", issues: settled.issues });
        } else if (settled.issues.length === 0) {
          attempts.push({ ...base, outcome: "accepted" });
          cancelRest();
          return { status: "accepted", data: settled.data, issues: [], providerId: flight.provider.id, attempts };
        } else {
          attempts.push({ ...base, outcome: "rejected", issues: settled.issues });
          if (best === null || settled.issues.length < best.issues.length) {
            best = { data: settled.data, issues: settled.issues, providerId: flight.provider.id };
          }
        }

        // Quem falhou libera a vez na hora: não há motivo para esperar o tempo de hedge.
        if (flights.size === 0) await launchNext();
      }

      // Ninguém foi aceito. Quem foi pulado só por cooldown ainda pode ser a segunda opinião (ou a única que responde):
      // tenta primeiro o que sai do cooldown antes. O cooldown é uma estimativa, e desistir é pior que errar de novo.
      if (ignoreCooldown || deferred.length === 0 || totalBudgetMs - (this.now() - startedAll) <= 0) break;
      deferred.sort((a, b) => a.until - b.until);
      for (const d of deferred) {
        queue.push(d.provider);
        retried.set(d.provider.id, d.skip);
      }
      deferred.length = 0;
      ignoreCooldown = true;
      await launchNext();
      if (flights.size === 0) break;
    }

    if (best) return { status: "needs_review", ...best, attempts };
    throw new AllProvidersFailedError(attempts);
  }

  /** Uma chamada a um provedor, até o veredito. Nunca lança: o resultado diz o que aconteceu. */
  private async runAttempt(
    provider: VisionProvider,
    doc: DocumentInput,
    controller: AbortController,
    state: { cancelled: boolean },
    ms: number,
    started: number,
    cfg: { minConfidence: number; cooldownMs: number; unavailableCooldownMs: number },
  ): Promise<Settled> {
    let raw: unknown;
    try {
      raw = await withTimeout((signal) => provider.extract(doc, signal), ms, controller);
    } catch (err) {
      const latencyMs = this.now() - started;
      // Cancelado por nós (outro provedor já venceu): não é falha do provedor e não gera cooldown.
      if (state.cancelled) return { kind: "error", errorKind: "unavailable", latencyMs, cancelled: true };
      const e = toProviderError(err);
      if (e.kind === "rate_limit" || e.kind === "unavailable" || e.kind === "timeout") {
        await this.cooldown
          .block(
            provider.id,
            this.now() + (e.retryAfterMs ?? (e.kind === "unavailable" ? cfg.unavailableCooldownMs : cfg.cooldownMs)),
            e.kind,
          )
          .catch(() => undefined); // falha ao registrar o cooldown não pode esconder o erro do provedor
      }
      return { kind: "error", errorKind: e.kind, latencyMs };
    }

    const latencyMs = this.now() - started;
    const parsed = parseExtraction(raw);
    if (!parsed.ok) return { kind: "invalid", issues: parsed.issues, latencyMs };
    const issues = checkBusinessRules(parsed.data, { minConfidence: cfg.minConfidence, today: this.today() });
    return { kind: "answer", data: parsed.data, issues, latencyMs };
  }
}

type Settled =
  | { kind: "answer"; data: ExtractedReceipt; issues: string[]; latencyMs: number }
  | { kind: "invalid"; issues: string[]; latencyMs: number }
  | { kind: "error"; errorKind: ProviderErrorKind; latencyMs: number; cancelled?: boolean };

interface Flight {
  id: number;
  provider: VisionProvider;
  controller: AbortController;
  /** Marcado pelo roteador quando ele mesmo cancela a tentativa (outro provedor venceu). */
  state: { cancelled: boolean };
  offset: number;
  promise: Promise<{ id: number; settled: Settled }>;
}

function toProviderError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  return new ProviderError("unavailable", err instanceof Error ? err.message : String(err));
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number, controller: AbortController = new AbortController()): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new ProviderError("timeout", `Sem resposta em ${ms} ms`));
    }, ms);
  });
  try {
    return await Promise.race([fn(controller.signal), timeout]);
  } catch (err) {
    // Alguns provedores rejeitam com AbortError antes de o nosso timeout rejeitar: ainda é um timeout.
    if (timedOut) throw new ProviderError("timeout", `Sem resposta em ${ms} ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
