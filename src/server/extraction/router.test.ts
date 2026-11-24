import { describe, expect, it } from "vitest";
import { InMemoryCooldownStore } from "./cooldown";
import { ProviderError, type VisionProvider } from "./provider";
import { InMemoryQuotaGuard, QuotaExceededError } from "./quota";
import { AllProvidersFailedError, ExtractionRouter } from "./router";
import { parseExtraction, type ExtractedReceipt } from "./schema";
import { checkBusinessRules } from "./validate";

const DOC = { mimeType: "image/png", data: new Uint8Array([1, 2, 3]) };

const GOOD: ExtractedReceipt = {
  documentType: "nota_fiscal",
  issueDate: "2026-05-10",
  totalCents: 150_00,
  issuerTaxId: "11.222.333/0001-81",
  recipientTaxId: null,
  accessKey: null,
  description: "Bolo de aniversário",
  confidence: 0.95,
};

const fake = (id: string, behavior: () => Promise<unknown>): VisionProvider & { calls: number } => {
  const p = {
    id,
    calls: 0,
    extract() {
      p.calls += 1;
      return behavior();
    },
  };
  return p;
};

const make = (providers: VisionProvider[], now = () => 1_000) =>
  new ExtractionRouter({ providers, now, today: () => "2026-05-12", timeoutMs: 50, cooldownMs: 10_000 });

describe("ExtractionRouter", () => {
  it("usa o primeiro provedor quando a extração é válida", async () => {
    const a = fake("a", async () => GOOD);
    const b = fake("b", async () => GOOD);
    const r = await make([a, b]).extract(DOC);
    expect(r.status).toBe("accepted");
    expect(r.providerId).toBe("a");
    expect(b.calls).toBe(0);
  });

  it("faz failover em erro 429 e segue para o próximo", async () => {
    const a = fake("a", async () => {
      throw new ProviderError("rate_limit", "429");
    });
    const b = fake("b", async () => GOOD);
    const r = await make([a, b]).extract(DOC);
    expect(r.providerId).toBe("b");
    expect(r.attempts.map((t) => [t.providerId, t.outcome, t.errorKind])).toEqual([
      ["a", "error", "rate_limit"],
      ["b", "accepted", undefined],
    ]);
  });

  it("coloca o provedor em cooldown e o pula nas próximas chamadas", async () => {
    let clock = 1_000;
    const a = fake("a", async () => {
      throw new ProviderError("rate_limit", "429");
    });
    const b = fake("b", async () => GOOD);
    const router = make([a, b], () => clock);

    await router.extract(DOC);
    const second = await router.extract(DOC);
    expect(a.calls).toBe(1);
    expect(second.attempts[0]).toMatchObject({ providerId: "a", outcome: "skipped_cooldown" });

    clock += 10_001; // cooldown expirou
    await router.extract(DOC);
    expect(a.calls).toBe(2);
  });

  it("escala para o próximo modelo quando a validação reprova (CNPJ inválido)", async () => {
    const bad = { ...GOOD, issuerTaxId: "11.222.333/0001-82" };
    const a = fake("a", async () => bad);
    const b = fake("b", async () => GOOD);
    const r = await make([a, b]).extract(DOC);
    expect(r.status).toBe("accepted");
    expect(r.providerId).toBe("b");
    expect(r.attempts[0]).toMatchObject({ outcome: "rejected" });
    expect(r.attempts[0]?.issues?.[0]).toMatch(/dígito verificador/);
  });

  it("escala quando o JSON não segue o schema", async () => {
    const a = fake("a", async () => ({ totalCents: "caro" }));
    const b = fake("b", async () => GOOD);
    const r = await make([a, b]).extract(DOC);
    expect(r.providerId).toBe("b");
  });

  it("devolve a melhor candidata para revisão manual se nenhuma passar", async () => {
    const worse = { ...GOOD, issuerTaxId: "123", confidence: 0.2 };
    const better = { ...GOOD, issuerTaxId: "123" };
    const r = await make([fake("a", async () => worse), fake("b", async () => better)]).extract(DOC);
    expect(r.status).toBe("needs_review");
    expect(r.providerId).toBe("b");
    expect(r.issues).toHaveLength(1);
  });

  it("lança erro quando todos os provedores falham tecnicamente", async () => {
    const down = () =>
      fake("x", async () => {
        throw new Error("rede caiu");
      });
    const router = make([down(), { ...down(), id: "y" } as VisionProvider]);
    await expect(router.extract(DOC)).rejects.toBeInstanceOf(AllProvidersFailedError);
  });

  it("aplica timeout e passa ao próximo provedor", async () => {
    const slow = fake("slow", () => new Promise(() => {}));
    const ok = fake("ok", async () => GOOD);
    const r = await make([slow, ok]).extract(DOC);
    expect(r.providerId).toBe("ok");
    expect(r.attempts[0]).toMatchObject({ outcome: "error", errorKind: "timeout" });
  });

  it("exige ao menos um provedor", () => {
    expect(() => new ExtractionRouter({ providers: [] })).toThrow();
  });
});

describe("ExtractionRouter: orçamento, capacidades, cooldown compartilhado e cota", () => {
  it("respeita o orçamento total e pula os provedores que sobraram", async () => {
    let clock = 1_000;
    const failing = (id: string, spentMs: number) =>
      fake(id, async () => {
        clock += spentMs;
        throw new ProviderError("unavailable", "fora do ar");
      });
    const a = failing("a", 20_000);
    const b = failing("b", 10_000);
    const c = fake("c", async () => GOOD);
    const router = new ExtractionRouter({
      providers: [a, b, c],
      now: () => clock,
      today: () => "2026-05-12",
      totalBudgetMs: 25_000,
    });

    const err = await router.extract(DOC).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AllProvidersFailedError);
    expect((err as AllProvidersFailedError).attempts.map((t) => t.outcome)).toEqual([
      "error",
      "error",
      "skipped_budget",
    ]);
    expect(c.calls).toBe(0);
  });

  it("pula provedores que não suportam o tipo ou o tamanho do arquivo", async () => {
    const pdfOnly = {
      ...fake("pdf", async () => GOOD),
      capabilities: { mimeTypes: ["application/pdf"], maxBytes: 1_000 },
    };
    const small = {
      ...fake("small", async () => GOOD),
      capabilities: { mimeTypes: ["image/png"], maxBytes: 2 },
    };
    const ok = fake("ok", async () => GOOD);
    const r = await make([pdfOnly, small, ok]).extract(DOC);
    expect(r.providerId).toBe("ok");
    expect(r.attempts.map((t) => t.outcome)).toEqual([
      "skipped_capability",
      "skipped_capability",
      "accepted",
    ]);
  });

  it("compartilha o cooldown entre instâncias do roteador (como em serverless)", async () => {
    const store = new InMemoryCooldownStore();
    const a = fake("a", async () => {
      throw new ProviderError("rate_limit", "429");
    });
    const b = fake("b", async () => GOOD);
    const opts = { providers: [a, b], now: () => 1_000, today: () => "2026-05-12", cooldownStore: store };

    await new ExtractionRouter(opts).extract(DOC); // instância 1 descobre o 429
    const second = await new ExtractionRouter(opts).extract(DOC); // instância 2 já sabe
    expect(a.calls).toBe(1);
    expect(second.attempts[0]).toMatchObject({ providerId: "a", outcome: "skipped_cooldown" });
  });

  it("respeita o Retry-After do provedor ao definir o cooldown", async () => {
    const store = new InMemoryCooldownStore();
    const a = fake("a", async () => {
      throw new ProviderError("rate_limit", "429", 5_000);
    });
    await new ExtractionRouter({
      providers: [a, fake("b", async () => GOOD)],
      now: () => 1_000,
      today: () => "2026-05-12",
      cooldownStore: store,
    }).extract(DOC);
    expect(await store.blockedUntil("a")).toBe(6_000);
  });

  it("bloqueia a extração quando o teto diário acaba, sem chamar nenhum provedor", async () => {
    const a = fake("a", async () => GOOD);
    const router = new ExtractionRouter({
      providers: [a],
      now: () => 1_000,
      today: () => "2026-05-12",
      quota: new InMemoryQuotaGuard(1),
    });
    await router.extract(DOC);
    await expect(router.extract(DOC)).rejects.toBeInstanceOf(QuotaExceededError);
    expect(a.calls).toBe(1);
  });

  it("a cota é por dia: o dia seguinte libera de novo", async () => {
    let day = "2026-05-12";
    const quota = new InMemoryQuotaGuard(1);
    const router = new ExtractionRouter({
      providers: [fake("a", async () => GOOD)],
      now: () => 1_000,
      today: () => day,
      quota,
    });
    await router.extract(DOC);
    day = "2026-05-13";
    await expect(router.extract(DOC)).resolves.toMatchObject({ status: "accepted" });
  });
});

describe("regras de negócio da extração", () => {
  const rules = { minConfidence: 0.7, today: "2026-05-12" };

  it("aceita uma extração coerente", () => {
    expect(checkBusinessRules(GOOD, rules)).toEqual([]);
  });

  it("aponta data inexistente, futura, valor e chave inválidos", () => {
    expect(checkBusinessRules({ ...GOOD, issueDate: "2026-02-30" }, rules)).toContain("data de emissão inválida");
    expect(checkBusinessRules({ ...GOOD, issueDate: "2026-06-01" }, rules)).toContain("data de emissão no futuro");
    expect(checkBusinessRules({ ...GOOD, totalCents: 0 }, rules)).toContain("valor deve ser positivo");
    expect(checkBusinessRules({ ...GOOD, accessKey: "123" }, rules)).toContain("chave de acesso inválida (44 dígitos com dígito verificador correto)");
  });

  it("valida o schema e rejeita campos extras de tipo errado", () => {
    expect(parseExtraction(GOOD).ok).toBe(true);
    expect(parseExtraction({ ...GOOD, confidence: 2 }).ok).toBe(false);
  });
});
