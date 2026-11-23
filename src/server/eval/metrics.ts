import { deriveDirection } from "@/core/documents";
import type { ExtractedReceipt } from "../extraction/schema";

export const FIELDS = ["documentType", "issueDate", "totalCents", "issuerTaxId", "recipientTaxId", "accessKey"] as const;
export type Field = (typeof FIELDS)[number];
export type Expected = Pick<ExtractedReceipt, Field>;

/** Campos que definem o impacto no limite: quando, quanto e entre quem. */
export const CORE_FIELDS: ReadonlyArray<Field> = ["issueDate", "totalCents", "issuerTaxId", "recipientTaxId"];

const digits = (v: string | null): string | null => (v === null ? null : v.replace(/\D/g, "") || null);

export function compareFields(expected: Expected, actual: ExtractedReceipt): Record<Field, boolean> {
  return {
    documentType: expected.documentType === actual.documentType,
    issueDate: expected.issueDate === actual.issueDate,
    totalCents: expected.totalCents === actual.totalCents,
    issuerTaxId: digits(expected.issuerTaxId) === digits(actual.issuerTaxId),
    recipientTaxId: digits(expected.recipientTaxId) === digits(actual.recipientTaxId),
    accessKey: digits(expected.accessKey) === digits(actual.accessKey),
  };
}

export const isCoreCorrect = (c: Record<Field, boolean>): boolean => CORE_FIELDS.every((f) => c[f]);

/** A direção (receita/despesa) derivada pelo código é a mesma do gabarito? */
export function isDirectionCorrect(ownerTaxId: string, expected: Expected, actual: ExtractedReceipt): boolean {
  return (
    deriveDirection(ownerTaxId, expected.issuerTaxId, expected.recipientTaxId) ===
    deriveDirection(ownerTaxId, actual.issuerTaxId, actual.recipientTaxId)
  );
}

/** Percentil pelo método do posto mais próximo. */
export function percentile(values: ReadonlyArray<number>, p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((p / 100) * sorted.length)));
  return sorted[rank - 1]!;
}

// --------------------------------------------------------------- por provedor
export type ProviderOutcome = "ok" | "schema_invalid" | "error" | "no_recording";

export interface ProviderCaseResult {
  caseId: string;
  tags: string[];
  outcome: ProviderOutcome;
  latencyMs: number | null;
  /** Problemas apontados pelas regras de negócio (CNPJ, data, valor, confiança). */
  rulesIssues: string[];
  fields: Record<Field, boolean> | null;
  directionOk: boolean | null;
}

export interface ProviderSummary {
  total: number;
  /** Casos com resposta gravada (os demais não entram nas taxas). */
  evaluated: number;
  schemaValidRate: number | null;
  fieldAccuracy: Record<Field, number> | null;
  coreCorrectRate: number | null;
  directionRate: number | null;
  rulesPassRate: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
}

const rate = (n: number, d: number): number | null => (d === 0 ? null : n / d);

export function summarizeProvider(results: ReadonlyArray<ProviderCaseResult>): ProviderSummary {
  const evaluated = results.filter((r) => r.outcome !== "no_recording");
  const ok = evaluated.filter((r) => r.outcome === "ok");
  const n = evaluated.length;

  const fieldAccuracy =
    n === 0
      ? null
      : (Object.fromEntries(
          FIELDS.map((f) => [f, ok.filter((r) => r.fields?.[f]).length / n]),
        ) as Record<Field, number>);

  return {
    total: results.length,
    evaluated: n,
    schemaValidRate: rate(ok.length, n),
    fieldAccuracy,
    coreCorrectRate: rate(ok.filter((r) => r.fields && isCoreCorrect(r.fields)).length, n),
    directionRate: rate(ok.filter((r) => r.directionOk).length, n),
    rulesPassRate: rate(ok.filter((r) => r.rulesIssues.length === 0).length, n),
    p50LatencyMs: percentile(evaluated.flatMap((r) => (r.latencyMs === null ? [] : [r.latencyMs])), 50),
    p95LatencyMs: percentile(evaluated.flatMap((r) => (r.latencyMs === null ? [] : [r.latencyMs])), 95),
  };
}

// ------------------------------------------------------------------ da cadeia
export interface ChainCaseResult {
  caseId: string;
  tags: string[];
  status: "accepted" | "needs_review" | "failed";
  providerId: string | null;
  attempts: number;
  coreCorrect: boolean | null;
  /** Campos centrais que divergem do gabarito (vazio se correta ou sem resposta). */
  wrongFields: string[];
  directionOk: boolean | null;
}

export interface ChainSummary {
  total: number;
  accepted: number;
  needsReview: number;
  failed: number;
  /** Aceitas automaticamente E corretas. */
  acceptedCorrect: number;
  /** Aceitas automaticamente mas ERRADAS: o pior caso, o erro silencioso. */
  silentWrong: number;
  acceptedCorrectRate: number | null;
  silentWrongRate: number | null;
  needsReviewRate: number | null;
  failedRate: number | null;
  avgAttempts: number | null;
  providerShare: Record<string, number>;
}

export function summarizeChain(results: ReadonlyArray<ChainCaseResult>): ChainSummary {
  const n = results.length;
  const accepted = results.filter((r) => r.status === "accepted");
  const silentWrong = accepted.filter((r) => r.coreCorrect === false).length;
  const acceptedCorrect = accepted.filter((r) => r.coreCorrect === true).length;
  const providerShare: Record<string, number> = {};
  for (const r of accepted) if (r.providerId) providerShare[r.providerId] = (providerShare[r.providerId] ?? 0) + 1;

  return {
    total: n,
    accepted: accepted.length,
    needsReview: results.filter((r) => r.status === "needs_review").length,
    failed: results.filter((r) => r.status === "failed").length,
    acceptedCorrect,
    silentWrong,
    acceptedCorrectRate: rate(acceptedCorrect, n),
    silentWrongRate: rate(silentWrong, n),
    needsReviewRate: rate(results.filter((r) => r.status === "needs_review").length, n),
    failedRate: rate(results.filter((r) => r.status === "failed").length, n),
    avgAttempts: n === 0 ? null : results.reduce((s, r) => s + r.attempts, 0) / n,
    providerShare,
  };
}

/** Resultado da cadeia agrupado por etiqueta (ex.: "adversarial"). */
export function breakdownByTag(results: ReadonlyArray<ChainCaseResult>): Record<string, { total: number; correct: number }> {
  const out: Record<string, { total: number; correct: number }> = {};
  for (const r of results) {
    for (const tag of r.tags) {
      const e = (out[tag] ??= { total: 0, correct: 0 });
      e.total += 1;
      if (r.status === "accepted" && r.coreCorrect) e.correct += 1;
    }
  }
  return out;
}
