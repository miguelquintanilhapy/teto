import { describe, expect, it } from "vitest";
import { splitProvider, summarizeExtractions, type ExtractionLog } from "./insights";

const log = (over: Partial<ExtractionLog> = {}): ExtractionLog => ({
  id: crypto.randomUUID(),
  status: "accepted",
  providerId: "or:model",
  promptVersion: "v3",
  createdAt: "2026-11-24T15:00:00Z",
  attempts: [{ providerId: "or:model", outcome: "accepted", latencyMs: 2000 }],
  ...over,
});

describe("summarizeExtractions", () => {
  it("devolve zeros e nulos sem leituras", () => {
    const s = summarizeExtractions([]);
    expect(s).toMatchObject({ total: 0, acceptRate: null, avgTotalMs: null, chainFollowed: 0, providers: [] });
  });

  it("calcula a taxa de aceitação e conta cada situação", () => {
    const s = summarizeExtractions([log(), log(), log({ status: "needs_review" }), log({ status: "failed", providerId: null, attempts: [] })]);
    expect(s).toMatchObject({ total: 4, accepted: 2, needsReview: 1, failed: 1 });
    expect(s.acceptRate).toBe(0.5);
  });

  it("separa as tentativas por modelo e conta os erros por tipo", () => {
    const s = summarizeExtractions([
      log({
        attempts: [
          { providerId: "g:a", outcome: "error", latencyMs: 3000, errorKind: "unavailable" },
          { providerId: "g:b", outcome: "error", latencyMs: 2000, errorKind: "unavailable" },
          { providerId: "or:model", outcome: "accepted", latencyMs: 2500 },
        ],
      }),
      log({ attempts: [{ providerId: "g:a", outcome: "skipped_cooldown", latencyMs: 0 }, { providerId: "or:model", outcome: "accepted", latencyMs: 1500 }] }),
    ]);
    const g = s.providers.find((p) => p.providerId === "g:a")!;
    expect(g).toMatchObject({ calls: 1, skipped: 1, errors: { unavailable: 1 }, accepted: 0 });
    const or = s.providers.find((p) => p.providerId === "or:model")!;
    expect(or).toMatchObject({ calls: 2, accepted: 2, finalProvider: 2 });
    expect(or.avgLatencyMs).toBe(2000);
    expect(s.chainFollowed).toBe(1); // só a primeira leitura passou por mais de um modelo de verdade
  });

  it("soma o tempo total de cada leitura", () => {
    const s = summarizeExtractions([
      log({ attempts: [{ providerId: "a", outcome: "error", latencyMs: 4000, errorKind: "timeout" }, { providerId: "b", outcome: "accepted", latencyMs: 2000 }] }),
      log({ attempts: [{ providerId: "b", outcome: "accepted", latencyMs: 2000 }] }),
    ]);
    expect(s.avgTotalMs).toBe(4000);
  });

  it("não conta latência de erro na média do modelo", () => {
    const s = summarizeExtractions([log({ attempts: [{ providerId: "a", outcome: "error", latencyMs: 9000, errorKind: "timeout" }] })]);
    expect(s.providers[0]!.avgLatencyMs).toBeNull();
  });
});

describe("splitProvider", () => {
  it("separa o provedor do modelo e deixa o nome legível", () => {
    expect(splitProvider("gemini:gemini-3.1-flash-lite")).toEqual({ provider: "Gemini", model: "gemini-3.1-flash-lite" });
    expect(splitProvider("openrouter:nvidia/nemotron:free")).toEqual({ provider: "OpenRouter", model: "nvidia/nemotron:free" });
    expect(splitProvider("x")).toEqual({ provider: "x", model: "" });
  });
});
