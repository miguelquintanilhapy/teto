import { describe, expect, it } from "vitest";
import { errorFromStatus, parseModelJson, parseRetryAfterMs, type FetchLike } from "../http";
import { ProviderError, canHandle, type DocumentInput } from "../provider";
import { ExtractionRouter } from "../router";
import type { ExtractedReceipt } from "../schema";
import { createGeminiProvider } from "./gemini";
import { buildProviders, createRouterFromEnv } from "./index";
import { createOpenRouterProvider } from "./openrouter";

const PNG: DocumentInput = { mimeType: "image/png", data: new Uint8Array([137, 80, 78, 71]) };
const PDF: DocumentInput = { mimeType: "application/pdf", data: new Uint8Array([37, 80, 68, 70]) };
const SIGNAL = new AbortController().signal;

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

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

interface Call {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

function mockFetch(handler: () => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    });
    return handler();
  }) as FetchLike;
  return { fn, calls };
}

const orReply = (content: string | null) => json({ choices: [{ message: { content } }] });
const gmReply = (parts: Array<{ text: string; thought?: boolean }>) =>
  json({ candidates: [{ content: { parts } }] });

describe("helpers HTTP", () => {
  it("interpreta Retry-After em segundos, data e valores inválidos", () => {
    expect(parseRetryAfterMs("7")).toBe(7_000);
    expect(parseRetryAfterMs(new Date(11_000).toUTCString(), 1_000)).toBe(10_000);
    expect(parseRetryAfterMs("99999")).toBe(3_600_000); // teto de 1 hora
    expect(parseRetryAfterMs(null)).toBeUndefined();
    expect(parseRetryAfterMs("abc")).toBeUndefined();
    expect(parseRetryAfterMs("-5")).toBeUndefined();
  });

  it("traduz status HTTP em tipos de falha", () => {
    expect(errorFromStatus(429, "x", 5_000)).toMatchObject({ kind: "rate_limit", retryAfterMs: 5_000 });
    expect(errorFromStatus(503, "x").kind).toBe("unavailable");
    expect(errorFromStatus(500, "x").kind).toBe("unavailable");
    expect(errorFromStatus(400, "x").kind).toBe("bad_request");
    // chave inválida ou sem crédito: sai da rotação por um bom tempo
    expect(errorFromStatus(401, "x")).toMatchObject({ kind: "unavailable", retryAfterMs: 600_000 });
    expect(errorFromStatus(403, "x").retryAfterMs).toBe(600_000);
  });

  it("lê JSON de modelo, inclusive com cerca de código, e devolve texto se não for JSON", () => {
    expect(parseModelJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseModelJson("não sei")).toBe("não sei");
    expect(parseModelJson("   ")).toBeNull();
    expect(parseModelJson(null)).toBeNull();
  });
});

describe("OpenRouter", () => {
  const make = (fn: FetchLike, extra = {}) =>
    createOpenRouterProvider({ apiKey: "k-secreta", model: "nvidia/nemotron-3.5-super-vl:free", fetch: fn, ...extra });

  it("monta o pedido: URL, autenticação, imagem em base64, schema estrito e raciocínio desligado", async () => {
    const { fn, calls } = mockFetch(() => orReply(JSON.stringify(GOOD)));
    const result = await make(fn, { title: "Teto" }).extract(PNG, SIGNAL);

    expect(result).toEqual(GOOD);
    const call = calls[0]!;
    expect(call.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(call.headers.Authorization).toBe("Bearer k-secreta");
    expect(call.headers["X-Title"]).toBe("Teto");
    expect(call.body.model).toBe("nvidia/nemotron-3.5-super-vl:free");
    expect(call.body.reasoning).toEqual({ enabled: false });
    expect(call.body.temperature).toBe(0);

    const rf = call.body.response_format as { type: string; json_schema: { strict: boolean; schema: Record<string, unknown> } };
    expect(rf.type).toBe("json_schema");
    expect(rf.json_schema.strict).toBe(true);
    expect(rf.json_schema.schema).not.toHaveProperty("$schema");
    expect(rf.json_schema.schema.additionalProperties).toBe(false);

    const messages = call.body.messages as Array<{ role: string; content: unknown }>;
    expect(messages[0]?.role).toBe("system");
    const user = messages[1]!.content as Array<{ type: string; image_url?: { url: string } }>;
    expect(user[1]?.image_url?.url).toBe("data:image/png;base64,iVBORw==");
  });

  it("permite manter o raciocínio padrão do modelo", async () => {
    const { fn, calls } = mockFetch(() => orReply("{}"));
    await make(fn, { disableReasoning: false }).extract(PNG, SIGNAL);
    expect(calls[0]!.body).not.toHaveProperty("reasoning");
  });

  it("aceita só imagem: PDF fica para o Gemini", () => {
    const p = make(mockFetch(() => orReply("{}")).fn);
    expect(canHandle(p, PNG)).toBe(true);
    expect(canHandle(p, PDF)).toBe(false);
  });

  it("devolve null em resposta vazia e o texto cru se não for JSON (o roteador reprova e escala)", async () => {
    expect(await make(mockFetch(() => orReply(null)).fn).extract(PNG, SIGNAL)).toBeNull();
    expect(await make(mockFetch(() => orReply("desculpe")).fn).extract(PNG, SIGNAL)).toBe("desculpe");
  });

  it("trata erro do provedor com HTTP 200 e corpo de erro", async () => {
    const { fn } = mockFetch(() => json({ error: { code: 429, message: "Rate limit exceeded" } }));
    await expect(make(fn).extract(PNG, SIGNAL)).rejects.toMatchObject({ kind: "rate_limit" });
  });

  it("converte 429 com Retry-After, 5xx e 400", async () => {
    const limited = mockFetch(() => json({ error: { message: "Rate limit" } }, 429, { "retry-after": "7" }));
    await expect(make(limited.fn).extract(PNG, SIGNAL)).rejects.toMatchObject({ kind: "rate_limit", retryAfterMs: 7_000 });

    const down = mockFetch(() => json({ error: { message: "boom" } }, 502));
    await expect(make(down.fn).extract(PNG, SIGNAL)).rejects.toMatchObject({ kind: "unavailable" });

    const bad = mockFetch(() => json({ error: { message: "schema" } }, 400));
    await expect(make(bad.fn).extract(PNG, SIGNAL)).rejects.toMatchObject({ kind: "bad_request" });
  });

  it("nunca coloca a chave na mensagem de erro", async () => {
    const { fn } = mockFetch(() => json({ error: { message: "invalid key" } }, 401));
    const err = await make(fn).extract(PNG, SIGNAL).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect((err as Error).message).not.toContain("k-secreta");
  });
});

describe("Gemini", () => {
  const make = (fn: FetchLike, extra = {}) =>
    createGeminiProvider({ apiKey: "g-secreta", model: "gemini-3.1-flash-lite", fetch: fn, ...extra });

  it("monta o pedido: URL do modelo, chave no cabeçalho, arquivo inline e schema JSON", async () => {
    const { fn, calls } = mockFetch(() => gmReply([{ text: JSON.stringify(GOOD) }]));
    const result = await make(fn).extract(PDF, SIGNAL);

    expect(result).toEqual(GOOD);
    const call = calls[0]!;
    expect(call.url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent");
    expect(call.headers["x-goog-api-key"]).toBe("g-secreta");
    expect(call.url).not.toContain("g-secreta"); // chave nunca na URL

    const contents = call.body.contents as Array<{ parts: Array<Record<string, unknown>> }>;
    expect(contents[0]!.parts[0]).toEqual({ inlineData: { mimeType: "application/pdf", data: "JVBERg==" } });

    const cfg = call.body.generationConfig as Record<string, unknown>;
    expect(cfg.responseMimeType).toBe("application/json");
    expect(cfg.responseJsonSchema).not.toHaveProperty("$schema");
    expect(cfg).not.toHaveProperty("thinkingConfig");
  });

  it("envia o nível de raciocínio só quando configurado", async () => {
    const { fn, calls } = mockFetch(() => gmReply([{ text: "{}" }]));
    await make(fn, { thinkingLevel: "low" }).extract(PNG, SIGNAL);
    expect((calls[0]!.body.generationConfig as Record<string, unknown>).thinkingConfig).toEqual({ thinkingLevel: "low" });
  });

  it("ignora as partes de raciocínio e junta o texto final", async () => {
    const { fn } = mockFetch(() =>
      gmReply([{ text: "pensando...", thought: true }, { text: '{"a":' }, { text: "1}" }]),
    );
    expect(await make(fn).extract(PNG, SIGNAL)).toEqual({ a: 1 });
  });

  it("devolve null quando o prompt é bloqueado (sem candidatos)", async () => {
    const { fn } = mockFetch(() => json({ promptFeedback: { blockReason: "SAFETY" } }));
    expect(await make(fn).extract(PNG, SIGNAL)).toBeNull();
  });

  it("converte 429 usando o retryDelay do corpo do erro", async () => {
    const { fn } = mockFetch(() =>
      json(
        {
          error: {
            code: 429,
            message: "Quota exceeded",
            status: "RESOURCE_EXHAUSTED",
            details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "30s" }],
          },
        },
        429,
      ),
    );
    await expect(make(fn).extract(PNG, SIGNAL)).rejects.toMatchObject({ kind: "rate_limit", retryAfterMs: 30_000 });
  });

  it("converte 503, 403 (chave) e 400", async () => {
    const e503 = mockFetch(() => json({ error: { message: "overloaded" } }, 503));
    await expect(make(e503.fn).extract(PNG, SIGNAL)).rejects.toMatchObject({ kind: "unavailable" });

    const e403 = mockFetch(() => json({ error: { message: "API key not valid" } }, 403));
    await expect(make(e403.fn).extract(PNG, SIGNAL)).rejects.toMatchObject({ kind: "unavailable", retryAfterMs: 600_000 });

    const e400 = mockFetch(() => json({ error: { message: "bad schema" } }, 400));
    await expect(make(e400.fn).extract(PNG, SIGNAL)).rejects.toMatchObject({ kind: "bad_request" });
  });

  it("aceita imagem e PDF", () => {
    const p = make(mockFetch(() => gmReply([])).fn);
    expect(canHandle(p, PNG)).toBe(true);
    expect(canHandle(p, PDF)).toBe(true);
    expect(canHandle(p, { mimeType: "image/gif", data: new Uint8Array(1) })).toBe(false);
  });
});

describe("cadeia montada a partir do ambiente", () => {
  const env = {
    modelChain: [
      { provider: "gemini" as const, model: "gemini-3.1-flash-lite" },
      { provider: "gemini" as const, model: "gemini-3.8-flash" },
      { provider: "openrouter" as const, model: "nvidia/nemotron-3.5-super-vl:free" },
    ],
    geminiApiKey: "g",
    openrouterApiKey: "o",
  };

  it("respeita a ordem do MODEL_CHAIN", () => {
    expect(buildProviders(env).map((p) => p.id)).toEqual([
      "gemini:gemini-3.1-flash-lite",
      "gemini:gemini-3.8-flash",
      "openrouter:nvidia/nemotron-3.5-super-vl:free",
    ]);
  });

  it("falha com mensagem clara se faltar a chave de um provedor da cadeia", () => {
    expect(() => buildProviders({ ...env, geminiApiKey: undefined })).toThrow(/GEMINI_API_KEY/);
    expect(() => buildProviders({ ...env, openrouterApiKey: undefined })).toThrow(/OPENROUTER_API_KEY/);
  });

  it("ponta a ponta: Gemini com 429 → OpenRouter assume e a extração é aceita", async () => {
    const urls: string[] = [];
    const fn = (async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("generativelanguage")) return json({ error: { message: "quota" } }, 429);
      return orReply(JSON.stringify(GOOD));
    }) as FetchLike;

    const router = createRouterFromEnv(env, { fetch: fn });
    expect(router).toBeInstanceOf(ExtractionRouter);

    const r = await router.extract(PNG);
    expect(r.status).toBe("accepted");
    expect(r.providerId).toBe("openrouter:nvidia/nemotron-3.5-super-vl:free");
    expect(r.attempts.map((a) => a.outcome)).toEqual(["error", "error", "accepted"]);
    expect(urls.filter((u) => u.includes("generativelanguage"))).toHaveLength(2);
  });
});
