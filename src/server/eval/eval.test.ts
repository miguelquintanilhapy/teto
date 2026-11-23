import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProviderError, type DocumentInput, type VisionProvider } from "../extraction/provider";
import type { ExtractedReceipt } from "../extraction/schema";
import {
  breakdownByTag,
  compareFields,
  isCoreCorrect,
  isDirectionCorrect,
  percentile,
  summarizeChain,
  summarizeProvider,
  type ChainCaseResult,
  type Expected,
  type ProviderCaseResult,
} from "./metrics";
import { RecordedProvider, sha256 } from "./recording";
import { renderReport } from "./report";

const MEI = "11.222.333/0001-81";
const OTHER = "12.345.678/0001-95";

const EXPECTED: Expected = {
  documentType: "nota_fiscal",
  issueDate: "2026-02-10",
  totalCents: 1_250_00,
  issuerTaxId: "11222333000181",
  recipientTaxId: "12345678000195",
  accessKey: null,
};
const ACTUAL: ExtractedReceipt = {
  ...EXPECTED,
  issuerTaxId: MEI,
  recipientTaxId: OTHER,
  description: "doces",
  confidence: 0.9,
};

describe("comparação de campos", () => {
  it("compara CPF/CNPJ e chave só pelos dígitos", () => {
    const c = compareFields(EXPECTED, ACTUAL);
    expect(c.issuerTaxId).toBe(true);
    expect(c.recipientTaxId).toBe(true);
    expect(isCoreCorrect(c)).toBe(true);
  });

  it("aponta valor e data errados", () => {
    const c = compareFields(EXPECTED, { ...ACTUAL, totalCents: 0, issueDate: "2026-02-11" });
    expect(c.totalCents).toBe(false);
    expect(c.issueDate).toBe(false);
    expect(isCoreCorrect(c)).toBe(false);
  });

  it("null esperado só bate com null (documento mascarado não pode ser adivinhado)", () => {
    const exp = { ...EXPECTED, recipientTaxId: null };
    expect(compareFields(exp, { ...ACTUAL, recipientTaxId: null }).recipientTaxId).toBe(true);
    expect(compareFields(exp, { ...ACTUAL, recipientTaxId: OTHER }).recipientTaxId).toBe(false);
  });

  it("detecta direção trocada (receita lida como despesa)", () => {
    expect(isDirectionCorrect(MEI, EXPECTED, ACTUAL)).toBe(true);
    expect(isDirectionCorrect(MEI, EXPECTED, { ...ACTUAL, issuerTaxId: OTHER, recipientTaxId: MEI })).toBe(false);
  });
});

describe("percentil", () => {
  it("usa o posto mais próximo", () => {
    expect(percentile([10, 20, 30, 40, 50], 50)).toBe(30);
    expect(percentile([10, 20, 30, 40, 50], 95)).toBe(50);
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([], 50)).toBeNull();
  });
});

const allOk = { documentType: true, issueDate: true, totalCents: true, issuerTaxId: true, recipientTaxId: true, accessKey: true };
const row = (over: Partial<ProviderCaseResult>): ProviderCaseResult => ({
  caseId: "c",
  tags: [],
  outcome: "ok",
  latencyMs: 1000,
  rulesIssues: [],
  fields: allOk,
  directionOk: true,
  ...over,
});

describe("resumo por modelo", () => {
  it("conta falhas contra o modelo e ignora casos sem gravação", () => {
    const s = summarizeProvider([
      row({ caseId: "1" }),
      row({ caseId: "2", fields: { ...allOk, totalCents: false } }),
      row({ caseId: "3", outcome: "schema_invalid", fields: null, directionOk: null }),
      row({ caseId: "4", outcome: "no_recording", latencyMs: null, fields: null, directionOk: null }),
    ]);
    expect(s.total).toBe(4);
    expect(s.evaluated).toBe(3);
    expect(s.schemaValidRate).toBeCloseTo(2 / 3);
    expect(s.coreCorrectRate).toBeCloseTo(1 / 3);
    expect(s.fieldAccuracy?.totalCents).toBeCloseTo(1 / 3);
  });

  it("não inventa taxas quando não há gravação nenhuma", () => {
    const s = summarizeProvider([row({ outcome: "no_recording", latencyMs: null, fields: null })]);
    expect(s.evaluated).toBe(0);
    expect(s.coreCorrectRate).toBeNull();
    expect(s.p50LatencyMs).toBeNull();
  });

  it("calcula p50 e p95 de latência", () => {
    const s = summarizeProvider([1, 2, 3, 4, 100].map((n, i) => row({ caseId: String(i), latencyMs: n * 1000 })));
    expect(s.p50LatencyMs).toBe(3000);
    expect(s.p95LatencyMs).toBe(100_000);
  });
});

const chainRow = (over: Partial<ChainCaseResult>): ChainCaseResult => ({
  caseId: "c",
  tags: [],
  status: "accepted",
  providerId: "a",
  attempts: 1,
  coreCorrect: true,
  wrongFields: [],
  directionOk: true,
  ...over,
});

describe("resumo da cadeia", () => {
  const results = [
    chainRow({ caseId: "1", tags: ["adversarial"] }),
    chainRow({ caseId: "2", providerId: "b", attempts: 2, tags: ["adversarial"] }),
    chainRow({ caseId: "3", coreCorrect: false, wrongFields: ["totalCents"] }), // erro silencioso
    chainRow({ caseId: "4", status: "needs_review", coreCorrect: false }),
    chainRow({ caseId: "5", status: "failed", providerId: null, attempts: 3, coreCorrect: null }),
  ];

  it("separa corretas, erros silenciosos, revisão e falha", () => {
    const s = summarizeChain(results);
    expect(s.total).toBe(5);
    expect(s.acceptedCorrect).toBe(2);
    expect(s.silentWrong).toBe(1);
    expect(s.needsReview).toBe(1);
    expect(s.failed).toBe(1);
    expect(s.silentWrongRate).toBeCloseTo(0.2);
    expect(s.providerShare).toEqual({ a: 2, b: 1 });
    expect(s.avgAttempts).toBeCloseTo(1.6);
  });

  it("agrupa por etiqueta", () => {
    expect(breakdownByTag(results).adversarial).toEqual({ total: 2, correct: 2 });
  });

  it("gera o relatório em Markdown com o erro silencioso em destaque", () => {
    const md = renderReport({
      promptVersion: "v2",
      mode: "replay",
      caseCount: 5,
      chain: ["gemini:a", "openrouter:b"],
      lastRecordedAt: "2026-11-24T10:00:00.000Z",
      providers: [{ id: "gemini:a", summary: summarizeProvider([row({})]), results: [row({ caseId: "3" })] }],
      chainSummary: summarizeChain(results),
      chainResults: results,
      byTag: breakdownByTag(results),
    });
    expect(md).toContain("# Resultados da avaliação da extração");
    expect(md).toContain("erro silencioso");
    expect(md).toContain("`3` (a): divergiu em totalCents");
    expect(md).toContain("2026-11-24");
  });
});

describe("gravação e repetição (VCR)", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "teto-eval-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const DOC: DocumentInput = { mimeType: "image/png", data: new Uint8Array([1, 2, 3]) };
  const inner = (answer: unknown): VisionProvider & { calls: number } => {
    const p = {
      id: "openrouter:vendor/model:free",
      calls: 0,
      async extract() {
        p.calls += 1;
        return answer;
      },
    };
    return p;
  };
  const signal = new AbortController().signal;
  const make = (p: VisionProvider, mode: "record" | "replay" | "live", promptVersion = "v2", refresh = false) =>
    new RecordedProvider(p, { mode, dir, promptVersion, refresh });

  it("grava na primeira vez e reaproveita nas seguintes, sem chamar o provedor de novo", async () => {
    const real = inner({ ok: 1 });
    const rec = make(real, "record");
    const first = await rec.extractWithMeta(DOC, signal);
    expect(first).toMatchObject({ raw: { ok: 1 }, fromRecording: false });
    const second = await rec.extractWithMeta(DOC, signal);
    expect(second.fromRecording).toBe(true);
    expect(real.calls).toBe(1);
  });

  it("repete a gravação sem provedor, sem rede e sem chave", async () => {
    await make(inner({ ok: 1 }), "record").extractWithMeta(DOC, signal);
    const never = inner("nunca chamado");
    const replayed = await make(never, "replay").extractWithMeta(DOC, signal);
    expect(replayed.raw).toEqual({ ok: 1 });
    expect(never.calls).toBe(0);
  });

  it("no replay, documento sem gravação falha com mensagem clara (sem cooldown)", async () => {
    const err = await make(inner({}), "replay").extractWithMeta(DOC, signal).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect((err as ProviderError).kind).toBe("bad_request");
    expect((err as Error).message).toMatch(/^sem gravação/);
  });

  it("gravação de outra versão do prompt deixa de valer", async () => {
    await make(inner({ ok: 1 }), "record", "v1").extractWithMeta(DOC, signal);
    await expect(make(inner({}), "replay", "v2").extractWithMeta(DOC, signal)).rejects.toThrow(/sem gravação/);
  });

  it("refresh regrava mesmo havendo gravação válida", async () => {
    await make(inner({ ok: 1 }), "record").extractWithMeta(DOC, signal);
    const real = inner({ ok: 2 });
    const r = await make(real, "record", "v2", true).extractWithMeta(DOC, signal);
    expect(r.raw).toEqual({ ok: 2 });
    expect(real.calls).toBe(1);
  });

  it("modo live sempre chama e nunca grava", async () => {
    const real = inner({ ok: 1 });
    await make(real, "live").extractWithMeta(DOC, signal);
    await make(real, "live").extractWithMeta(DOC, signal);
    expect(real.calls).toBe(2);
    await expect(make(inner({}), "replay").extractWithMeta(DOC, signal)).rejects.toThrow();
  });

  it("o hash identifica o conteúdo do arquivo", () => {
    expect(sha256(new Uint8Array([1, 2, 3]))).toBe(sha256(new Uint8Array([1, 2, 3])));
    expect(sha256(new Uint8Array([1, 2, 3]))).not.toBe(sha256(new Uint8Array([1, 2, 4])));
  });
});
