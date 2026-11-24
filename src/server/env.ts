import { z } from "zod";

export type ProviderKind = "gemini" | "openrouter";
export interface ChainEntry {
  provider: ProviderKind;
  model: string;
}

const PROVIDERS: ReadonlyArray<ProviderKind> = ["gemini", "openrouter"];

/** "gemini:modelo-a,openrouter:modelo-b" → lista ordenada da cadeia. */
export function parseModelChain(raw: string): ChainEntry[] {
  const entries = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      const idx = item.indexOf(":");
      const provider = idx === -1 ? "" : item.slice(0, idx).trim();
      const model = idx === -1 ? "" : item.slice(idx + 1).trim();
      if (!PROVIDERS.includes(provider as ProviderKind) || model === "") {
        throw new Error(`Entrada inválida em MODEL_CHAIN: "${item}" (use provedor:modelo)`);
      }
      return { provider: provider as ProviderKind, model };
    });
  if (entries.length === 0) throw new Error("MODEL_CHAIN está vazia");
  return entries;
}

const EnvSchema = z.object({
  MODEL_CHAIN: z.string().min(1, "defina a cadeia de modelos"),
  GEMINI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.url("deve ser uma URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().optional(),
  /** Remetente dos alertas. Sem domínio verificado no Resend, use o remetente de teste deles. */
  ALERT_FROM: z.string().optional(),
  CRON_SECRET: z.string().min(16, "use ao menos 16 caracteres"),
  EXTRACTION_DAILY_QUOTA: z.coerce.number().int().positive().default(200),
});

export interface Env {
  modelChain: ChainEntry[];
  geminiApiKey?: string;
  openrouterApiKey?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  resendApiKey?: string;
  alertFrom: string;
  cronSecret: string;
  extractionDailyQuota: number;
}

export type EnvResult = { ok: true; env: Env } | { ok: false; errors: string[] };

/** Valida tudo de uma vez e lista todos os problemas, não só o primeiro. */
export function parseEnv(source: Record<string, string | undefined>): EnvResult {
  // `VAR=` vazio no .env conta como ausente
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v !== ""));
  const parsed = EnvSchema.safeParse(cleaned);
  const errors: string[] = [];
  if (!parsed.success) {
    for (const i of parsed.error.issues) errors.push(`${i.path.join(".")}: ${i.message}`);
  }

  let chain: ChainEntry[] = [];
  if (cleaned.MODEL_CHAIN) {
    try {
      chain = parseModelChain(cleaned.MODEL_CHAIN);
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  if (chain.some((c) => c.provider === "gemini") && !cleaned.GEMINI_API_KEY) {
    errors.push("GEMINI_API_KEY: obrigatória porque a cadeia usa o Gemini");
  }
  if (chain.some((c) => c.provider === "openrouter") && !cleaned.OPENROUTER_API_KEY) {
    errors.push("OPENROUTER_API_KEY: obrigatória porque a cadeia usa o OpenRouter");
  }

  if (errors.length > 0 || !parsed.success) return { ok: false, errors };
  const d = parsed.data;
  return {
    ok: true,
    env: {
      modelChain: chain,
      geminiApiKey: d.GEMINI_API_KEY,
      openrouterApiKey: d.OPENROUTER_API_KEY,
      supabaseUrl: d.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: d.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceRoleKey: d.SUPABASE_SERVICE_ROLE_KEY,
      resendApiKey: d.RESEND_API_KEY,
      alertFrom: d.ALERT_FROM?.trim() || "Teto <onboarding@resend.dev>",
      cronSecret: d.CRON_SECRET,
      extractionDailyQuota: d.EXTRACTION_DAILY_QUOTA,
    },
  };
}

let cached: Env | undefined;

/** Lê e valida `process.env` uma vez. Falha com mensagem legível se algo faltar. */
export function getEnv(): Env {
  if (cached) return cached;
  const result = parseEnv(process.env);
  if (!result.ok) {
    throw new Error(`Configuração inválida:\n${result.errors.map((e) => ` - ${e}`).join("\n")}`);
  }
  cached = result.env;
  return cached;
}
