import { describe, expect, it } from "vitest";
import { parseEnv, parseModelChain } from "./env";

const VALID = {
  MODEL_CHAIN: "gemini:flash-lite, gemini:flash, openrouter:free-vision",
  GEMINI_API_KEY: "g-key",
  OPENROUTER_API_KEY: "o-key",
  NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  CRON_SECRET: "0123456789abcdef",
};

describe("parseModelChain", () => {
  it("lê a cadeia em ordem, ignorando espaços", () => {
    expect(parseModelChain("gemini:a , openrouter:b")).toEqual([
      { provider: "gemini", model: "a" },
      { provider: "openrouter", model: "b" },
    ]);
  });

  it("aceita modelos com ':' no nome (ex.: sufixo :free)", () => {
    expect(parseModelChain("openrouter:vendor/model:free")).toEqual([
      { provider: "openrouter", model: "vendor/model:free" },
    ]);
  });

  it.each(["", "gemini", "gemini:", "foo:bar", ":x"])("rejeita entrada inválida %j", (raw) => {
    expect(() => parseModelChain(raw)).toThrow();
  });
});

describe("parseEnv", () => {
  it("aceita uma configuração completa e aplica o padrão da cota", () => {
    const r = parseEnv(VALID);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.env.modelChain).toHaveLength(3);
      expect(r.env.extractionDailyQuota).toBe(200);
      expect(r.env.resendApiKey).toBeUndefined();
    }
  });

  it("trata variável vazia como ausente e lista todos os erros de uma vez", () => {
    const r = parseEnv({ ...VALID, GEMINI_API_KEY: "", CRON_SECRET: "curta", NEXT_PUBLIC_SUPABASE_URL: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.join("\n")).toMatch(/GEMINI_API_KEY/);
      expect(r.errors.join("\n")).toMatch(/CRON_SECRET/);
      expect(r.errors.join("\n")).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
    }
  });

  it("só exige a chave dos provedores que a cadeia realmente usa", () => {
    const rest = { ...VALID, OPENROUTER_API_KEY: undefined };
    expect(parseEnv({ ...rest, MODEL_CHAIN: "gemini:flash" }).ok).toBe(true);
    const r = parseEnv({ ...rest, MODEL_CHAIN: "gemini:flash,openrouter:free" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/OPENROUTER_API_KEY/);
  });

  it("reporta cadeia mal formada", () => {
    const r = parseEnv({ ...VALID, MODEL_CHAIN: "gemini" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join("\n")).toMatch(/MODEL_CHAIN/);
  });
});
