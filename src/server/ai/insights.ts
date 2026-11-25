import type { Attempt } from "@/server/extraction/router";

/** Uma leitura de nota, como o banco a guarda. */
export interface ExtractionLog {
  id: string;
  status: "accepted" | "needs_review" | "failed";
  providerId: string | null;
  promptVersion: string;
  createdAt: string;
  attempts: Attempt[];
}

export interface ProviderStats {
  providerId: string;
  /** Chamadas de verdade (sem as puladas por cooldown, capacidade ou orçamento). */
  calls: number;
  accepted: number;
  rejected: number;
  errors: Record<string, number>;
  skipped: number;
  /** Latência média das chamadas que responderam (aceitas ou reprovadas), em ms. */
  avgLatencyMs: number | null;
  /** Em quantas leituras este foi o modelo que entregou o resultado final. */
  finalProvider: number;
}

export interface InsightsSummary {
  total: number;
  accepted: number;
  needsReview: number;
  failed: number;
  /** Fração de leituras que um modelo entregou e passou na validação. */
  acceptRate: number | null;
  /** Tempo total médio por leitura (soma das tentativas), em ms. */
  avgTotalMs: number | null;
  /** Leituras em que o primeiro modelo não bastou e a cadeia seguiu para o próximo. */
  chainFollowed: number;
  providers: ProviderStats[];
}

const avg = (xs: number[]): number | null => (xs.length === 0 ? null : Math.round(xs.reduce((s, v) => s + v, 0) / xs.length));

/** Resume as leituras recentes: quem leu, com que taxa de acerto, quanto demorou e onde falhou. */
export function summarizeExtractions(logs: ReadonlyArray<ExtractionLog>): InsightsSummary {
  const byProvider = new Map<string, ProviderStats & { latencies: number[] }>();
  const stats = (id: string) => {
    let s = byProvider.get(id);
    if (!s) {
      s = { providerId: id, calls: 0, accepted: 0, rejected: 0, errors: {}, skipped: 0, avgLatencyMs: null, finalProvider: 0, latencies: [] };
      byProvider.set(id, s);
    }
    return s;
  };

  let chainFollowed = 0;
  const totals: number[] = [];

  for (const log of logs) {
    const real = log.attempts.filter((a) => !a.outcome.startsWith("skipped"));
    if (real.length > 1) chainFollowed += 1;
    totals.push(log.attempts.reduce((s, a) => s + (a.latencyMs || 0), 0));
    if (log.providerId) stats(log.providerId).finalProvider += 1;

    for (const a of log.attempts) {
      const s = stats(a.providerId);
      if (a.outcome.startsWith("skipped")) {
        s.skipped += 1;
        continue;
      }
      s.calls += 1;
      if (a.outcome === "accepted") s.accepted += 1;
      else if (a.outcome === "rejected") s.rejected += 1;
      else if (a.outcome === "error") s.errors[a.errorKind ?? "unknown"] = (s.errors[a.errorKind ?? "unknown"] ?? 0) + 1;
      if (a.outcome === "accepted" || a.outcome === "rejected") s.latencies.push(a.latencyMs);
    }
  }

  const accepted = logs.filter((l) => l.status === "accepted").length;
  return {
    total: logs.length,
    accepted,
    needsReview: logs.filter((l) => l.status === "needs_review").length,
    failed: logs.filter((l) => l.status === "failed").length,
    acceptRate: logs.length === 0 ? null : accepted / logs.length,
    avgTotalMs: avg(totals),
    chainFollowed,
    providers: [...byProvider.values()]
      .map(({ latencies, ...s }) => ({ ...s, avgLatencyMs: avg(latencies) }))
      .sort((a, b) => b.calls - a.calls || a.providerId.localeCompare(b.providerId)),
  };
}

/** "gemini:gemini-3.1-flash-lite" vira { provider: "Gemini", model: "gemini-3.1-flash-lite" }. */
export function splitProvider(id: string): { provider: string; model: string } {
  const i = id.indexOf(":");
  const provider = i < 0 ? id : id.slice(0, i);
  const model = i < 0 ? "" : id.slice(i + 1);
  const pretty = provider === "gemini" ? "Gemini" : provider === "openrouter" ? "OpenRouter" : provider;
  return { provider: pretty, model };
}

const ERROR_LABEL: Record<string, string> = {
  unavailable: "indisponível",
  rate_limit: "limite de uso",
  timeout: "demorou demais",
  unknown: "erro",
};
export const errorLabel = (kind: string) => ERROR_LABEL[kind] ?? kind;
