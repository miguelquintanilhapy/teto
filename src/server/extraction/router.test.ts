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

  it("deixa fora por mais tempo o provedor que respondeu 'indisponível' (alta demanda)", async () => {
    let clock = 1_000;
    const a = fake("a", async () => {
      throw new ProviderError("unavailable", "HTTP 503");
    });
    const b = fake("b", async () => GOOD);
    const router = new ExtractionRouter({
      providers: [a, b],
      now: () => clock,
      today: () => "2026-05-12",
      timeoutMs: 50,
      cooldownMs: 10_000,
      unavailableCooldownMs: 120_000,
    });
    await router.extract(DOC);
    clock += 60_000; // já passou o cooldown comum, mas não o de "indisponível"
    const second = await router.extract(DOC);
    expect(second.attempts[0]).toMatchObject({ providerId: "a", outcome: "skipped_cooldown" });
    expect(a.calls).toBe(1);
    clock += 61_000;
    await router.extract(DOC);
    expect(a.calls).toBe(2);
  });

  it("o cooldown de 429 continua curto", async () => {
    let clock = 1_000;
    const a = fake("a", async () => {
      throw new ProviderError("rate_limit", "429");
    });
    const b = fake("b", async () => GOOD);
    const router = new ExtractionRouter({
      providers: [a, b],
      now: () => clock,
      today: () => "2026-05-12",
      timeoutMs: 50,
      cooldownMs: 10_000,
      unavailableCooldownMs: 120_000,
    });
    await router.extract(DOC);
    clock += 10_001;
    await router.extract(DOC);
    expect(a.calls).toBe(2);
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

describe("ExtractionRouter: resiliência quando o banco de apoio falha", () => {
  const brokenCooldown = {
    blockedUntil: async () => {
      throw new Error("banco fora do ar");
    },
    block: async () => {
      throw new Error("banco fora do ar");
    },
  };

  it("segue sem o cooldown se o banco do cooldown falhar", async () => {
    const a = fake("a", async () => GOOD);
    const router = new ExtractionRouter({ providers: [a], now: () => 1_000, today: () => "2026-05-12", cooldownStore: brokenCooldown });
    await expect(router.extract(DOC)).resolves.toMatchObject({ status: "accepted", providerId: "a" });
  });

  it("não esconde o erro do provedor se registrar o cooldown falhar", async () => {
    const a = fake("a", async () => {
      throw new ProviderError("rate_limit", "429");
    });
    const b = fake("b", async () => GOOD);
    const router = new ExtractionRouter({ providers: [a, b], now: () => 1_000, today: () => "2026-05-12", cooldownStore: brokenCooldown });
    const r = await router.extract(DOC);
    expect(r.providerId).toBe("b");
    expect(r.attempts[0]).toMatchObject({ providerId: "a", outcome: "error", errorKind: "rate_limit" });
  });

  it("libera a extração (fail-open) se o banco da cota falhar", async () => {
    const quota = {
      tryConsume: async () => {
        throw new Error("banco fora do ar");
      },
    };
    const router = new ExtractionRouter({ providers: [fake("a", async () => GOOD)], now: () => 1_000, today: () => "2026-05-12", quota });
    await expect(router.extract(DOC)).resolves.toMatchObject({ status: "accepted" });
  });
});

describe("ExtractionRouter: segundo modelo em paralelo (hedging)", () => {
  /** Provedor que responde depois de `ms`, respeita o cancelamento e conta se foi cancelado. */
  const after = (id: string, ms: number, result: () => unknown) => {
    const p = {
      id,
      calls: 0,
      aborted: false,
      extract(_doc: unknown, signal: AbortSignal) {
        p.calls += 1;
        return new Promise<unknown>((resolve, reject) => {
          const t = setTimeout(() => {
            try {
              resolve(result());
            } catch (e) {
              reject(e);
            }
          }, ms);
          signal.addEventListener("abort", () => {
            clearTimeout(t);
            p.aborted = true;
            reject(new DOMException("cancelado", "AbortError"));
          });
        });
      },
    };
    return p;
  };

  const real = (providers: VisionProvider[], extra: Partial<ConstructorParameters<typeof ExtractionRouter>[0]> = {}) =>
    new ExtractionRouter({ providers, today: () => "2026-05-12", timeoutMs: 1_000, hedgeAfterMs: 30, ...extra });

  it("dispara o segundo quando o primeiro demora, e o que responde antes vence", async () => {
    const a = after("a", 400, () => GOOD);
    const b = after("b", 5, () => GOOD);
    const t0 = Date.now();
    const r = await real([a, b]).extract(DOC);
    expect(r.providerId).toBe("b");
    expect(Date.now() - t0).toBeLessThan(250); // sem o paralelo, esperaria os 400 ms do primeiro
    expect(a.aborted).toBe(true);
    expect(r.attempts.map((t) => [t.providerId, t.outcome])).toEqual([
      ["b", "accepted"],
      ["a", "cancelled"],
    ]);
  });

  it("o primeiro ainda pode vencer depois de o segundo entrar", async () => {
    const a = after("a", 80, () => GOOD);
    const b = after("b", 500, () => GOOD);
    const r = await real([a, b]).extract(DOC);
    expect(r.providerId).toBe("a");
    expect(b.calls).toBe(1);
    expect(b.aborted).toBe(true);
  });

  it("não dispara o segundo quando o primeiro responde a tempo", async () => {
    const a = after("a", 5, () => GOOD);
    const b = after("b", 5, () => GOOD);
    const r = await real([a, b]).extract(DOC);
    expect(r.providerId).toBe("a");
    expect(b.calls).toBe(0);
    expect(r.attempts).toHaveLength(1);
  });

  it("quando o primeiro falha, o segundo entra na hora, sem esperar o tempo de hedge", async () => {
    const a = after("a", 5, () => {
      throw new ProviderError("unavailable", "503");
    });
    const b = after("b", 5, () => GOOD);
    const t0 = Date.now();
    const r = await real([a, b], { hedgeAfterMs: 5_000 }).extract(DOC);
    expect(r.providerId).toBe("b");
    expect(Date.now() - t0).toBeLessThan(1_000);
    expect(r.attempts.map((t) => [t.providerId, t.outcome, t.errorKind])).toEqual([
      ["a", "error", "unavailable"],
      ["b", "accepted", undefined],
    ]);
  });

  it("quem foi cancelado porque outro venceu não entra em cooldown", async () => {
    const cooldown = new InMemoryCooldownStore();
    const a = after("a", 400, () => GOOD);
    const b = after("b", 5, () => GOOD);
    await real([a, b], { cooldownStore: cooldown }).extract(DOC);
    await new Promise((r) => setTimeout(r, 20)); // dá tempo de o cancelamento terminar
    expect(await cooldown.blockedUntil("a")).toBeNull();
  });

  it("quem estoura o tempo continua indo para o cooldown, mesmo com o paralelo", async () => {
    const cooldown = new InMemoryCooldownStore();
    const a = after("a", 400, () => GOOD);
    const b = after("b", 60, () => GOOD);
    await real([a, b], { cooldownStore: cooldown, timeoutMs: 40 }).extract(DOC).catch(() => undefined);
    expect(await cooldown.blockedUntil("a")).not.toBeNull();
  });

  it("registra quando cada tentativa começou, e as tentativas em paralelo se sobrepõem", async () => {
    const a = after("a", 400, () => GOOD);
    const b = after("b", 5, () => GOOD);
    const r = await real([a, b]).extract(DOC);
    const byId = Object.fromEntries(r.attempts.map((t) => [t.providerId, t]));
    expect(byId.a!.startOffsetMs).toBeLessThan(10);
    expect(byId.b!.startOffsetMs).toBeGreaterThanOrEqual(25);
  });

  it("com hedgeAfterMs infinito a cadeia é estritamente sequencial", async () => {
    const a = after("a", 80, () => GOOD);
    const b = after("b", 5, () => GOOD);
    const r = await real([a, b], { hedgeAfterMs: Infinity }).extract(DOC);
    expect(r.providerId).toBe("a");
    expect(b.calls).toBe(0);
  });

  it("devolve a melhor candidata para revisão se ninguém passa na validação", async () => {
    const weak = { ...GOOD, issueDate: "2026-02-30" };
    const a = after("a", 5, () => weak);
    const b = after("b", 5, () => weak);
    const r = await real([a, b]).extract(DOC);
    expect(r.status).toBe("needs_review");
    expect(r.attempts.filter((t) => t.outcome === "rejected")).toHaveLength(2);
  });

  it("falha por inteiro quando todos erram", async () => {
    const boom = () => {
      throw new ProviderError("unavailable", "503");
    };
    await expect(real([after("a", 5, boom), after("b", 5, boom)]).extract(DOC)).rejects.toBeInstanceOf(AllProvidersFailedError);
  });
});

describe("ExtractionRouter: último recurso quando só sobrou quem está em cooldown", () => {
  const T0 = 1_000;
  const router = (providers: VisionProvider[], cooldown: InMemoryCooldownStore) =>
    new ExtractionRouter({ providers, cooldownStore: cooldown, now: () => T0, today: () => "2026-05-12", timeoutMs: 50 });

  it("se todos estão em cooldown, tenta mesmo assim, começando por quem sai dele primeiro", async () => {
    const cooldown = new InMemoryCooldownStore();
    await cooldown.block("a", 9_000);
    await cooldown.block("b", 3_000);
    const a = fake("a", async () => GOOD);
    const b = fake("b", async () => GOOD);
    const r = await router([a, b], cooldown).extract(DOC);
    expect(r.providerId).toBe("b"); // b sai do cooldown antes
    expect(a.calls).toBe(0);
    // quem foi retentado deixa de aparecer como "pulado"; quem nem chegou a ser tentado continua pulado
    expect(r.attempts.map((t) => [t.providerId, t.outcome])).toEqual([
      ["a", "skipped_cooldown"],
      ["b", "accepted"],
    ]);
  });

  it("quem estava em cooldown é a segunda opinião quando o outro só devolveu uma extração reprovada", async () => {
    const cooldown = new InMemoryCooldownStore();
    await cooldown.block("b", 9_000);
    const weak = { ...GOOD, issueDate: "2026-02-30" };
    const a = fake("a", async () => weak);
    const b = fake("b", async () => GOOD);
    const r = await router([a, b], cooldown).extract(DOC);
    expect(r.status).toBe("accepted");
    expect(r.providerId).toBe("b");
    expect(a.calls).toBe(1);
    expect(b.calls).toBe(1);
  });

  it("não retenta quem estava em cooldown se alguém já foi aceito", async () => {
    const cooldown = new InMemoryCooldownStore();
    await cooldown.block("b", 9_000);
    const a = fake("a", async () => GOOD);
    const b = fake("b", async () => GOOD);
    const r = await router([a, b], cooldown).extract(DOC);
    expect(r.providerId).toBe("a");
    expect(b.calls).toBe(0);
  });

  it("se o provedor retentado também falha, a extração falha por inteiro (sem laço infinito)", async () => {
    const cooldown = new InMemoryCooldownStore();
    await cooldown.block("a", 9_000);
    const a = fake("a", async () => {
      throw new ProviderError("unavailable", "503");
    });
    await expect(router([a], cooldown).extract(DOC)).rejects.toBeInstanceOf(AllProvidersFailedError);
    expect(a.calls).toBe(1);
  });

  it("sem orçamento de tempo, não retenta ninguém", async () => {
    const cooldown = new InMemoryCooldownStore();
    await cooldown.block("a", 9_000);
    let t = 1_000;
    const a = fake("a", async () => GOOD);
    const r = new ExtractionRouter({ providers: [a], cooldownStore: cooldown, now: () => (t += 50_000), today: () => "2026-05-12", totalBudgetMs: 10_000 });
    await expect(r.extract(DOC)).rejects.toBeInstanceOf(AllProvidersFailedError);
    expect(a.calls).toBe(0);
  });
});

describe("ExtractionRouter: chave de acesso que não confere", () => {
  const GOOD_KEY = "35260511222333000181550010000002011015917191"; // chave válida (módulo 11)
  const BAD_KEY = "35260511222333000181550010000002011015917192"; // um dígito a mais no verificador

  it("descarta a chave ilegível e aceita a nota, com um aviso", async () => {
    const a = fake("a", async () => ({ ...GOOD, accessKey: BAD_KEY }));
    const b = fake("b", async () => GOOD);
    const r = await make([a, b]).extract(DOC);
    expect(r.status).toBe("accepted");
    expect(r.providerId).toBe("a"); // não escalou para o próximo modelo por causa da chave
    expect(b.calls).toBe(0);
    expect(r.data.accessKey).toBeNull();
    expect(r.issues).toEqual(["chave de acesso ilegível, ignorada"]);
    expect(r.attempts[0]).toMatchObject({ outcome: "accepted", issues: ["chave de acesso ilegível, ignorada"] });
  });

  it("mantém a chave que confere, sem aviso", async () => {
    const r = await make([fake("a", async () => ({ ...GOOD, accessKey: GOOD_KEY }))]).extract(DOC);
    expect(r.status).toBe("accepted");
    expect(r.data.accessKey).toBe(GOOD_KEY);
    expect(r.issues).toEqual([]);
  });

  it("uma chave com dígitos a menos também é descartada", async () => {
    const r = await make([fake("a", async () => ({ ...GOOD, accessKey: "1234" }))]).extract(DOC);
    expect(r.status).toBe("accepted");
    expect(r.data.accessKey).toBeNull();
  });

  it("CNPJ com dígito inválido continua reprovando: ele decide receita ou despesa", async () => {
    const a = fake("a", async () => ({ ...GOOD, issuerTaxId: "11.222.333/0001-82", accessKey: BAD_KEY }));
    const b = fake("b", async () => GOOD);
    const r = await make([a, b]).extract(DOC);
    expect(r.providerId).toBe("b");
    expect(r.attempts[0]).toMatchObject({ outcome: "rejected" });
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
