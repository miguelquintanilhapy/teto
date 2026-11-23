import { ProviderError } from "./provider";

export type FetchLike = typeof fetch;

const ONE_HOUR_MS = 3_600_000;
/** Erro de autenticação ou crédito não some sozinho: evita martelar o provedor. */
const AUTH_COOLDOWN_MS = 600_000;

/** Interpreta o cabeçalho Retry-After (segundos ou data HTTP) em milissegundos. */
export function parseRetryAfterMs(header: string | null, nowMs: number = Date.now()): number | undefined {
  if (header === null || header.trim() === "") return undefined;
  const seconds = Number(header);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - nowMs;
  if (!Number.isFinite(ms) || ms <= 0) return undefined;
  return Math.min(ms, ONE_HOUR_MS);
}

/** Traduz um status HTTP no tipo de falha que o roteador entende. */
export function errorFromStatus(status: number, message: string, retryAfterMs?: number): ProviderError {
  const text = `HTTP ${status}: ${message}`;
  if (status === 429) return new ProviderError("rate_limit", text, retryAfterMs);
  if ([408, 500, 502, 503, 504].includes(status)) return new ProviderError("unavailable", text, retryAfterMs);
  if ([401, 402, 403].includes(status)) {
    return new ProviderError("unavailable", text, retryAfterMs ?? AUTH_COOLDOWN_MS);
  }
  return new ProviderError("bad_request", text);
}

export function toBase64(data: Uint8Array): string {
  return Buffer.from(data).toString("base64");
}

/**
 * Lê o JSON devolvido por um modelo. Tolera cercas de código (```json).
 * Se não for JSON, devolve o texto cru: o roteador o reprova no schema e escala.
 */
export function parseModelJson(text: string | null | undefined): unknown {
  if (text === null || text === undefined || text.trim() === "") return null;
  const unfenced = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(unfenced);
  } catch {
    return text;
  }
}

/** Mensagem curta de erro vinda do corpo, sem nunca expor cabeçalhos ou chaves. */
export async function readErrorMessage(res: Response): Promise<{ message: string; body: unknown }> {
  const raw = await res.text().catch(() => "");
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    /* corpo não é JSON */
  }
  const err = (body as { error?: { message?: unknown } } | null)?.error;
  const message = typeof err?.message === "string" ? err.message : raw.slice(0, 200);
  return { message: message.slice(0, 300), body };
}
