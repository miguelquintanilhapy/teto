import { errorFromStatus, parseModelJson, parseRetryAfterMs, readErrorMessage, toBase64, type FetchLike } from "../http";
import { SYSTEM_PROMPT, USER_INSTRUCTION } from "../prompt";
import type { DocumentInput, VisionProvider } from "../provider";
import { providerJsonSchema } from "../schema";

export interface GeminiOptions {
  apiKey: string;
  /** Ex.: gemini-3.1-flash-lite */
  model: string;
  fetch?: FetchLike;
  baseUrl?: string;
  maxOutputTokens?: number;
  /**
   * Nível de raciocínio. Se omitido, usa o padrão do modelo. Atenção: "minimal"
   * não é aceito pelo gemini-3.8-flash (a API devolve erro), por isso o tipo o exclui.
   */
  thinkingLevel?: "low" | "medium" | "high";
}

/** Adaptador do Gemini (generateContent), com imagem ou PDF em base64. */
export function createGeminiProvider(opts: GeminiOptions): VisionProvider {
  const doFetch = opts.fetch ?? fetch;
  const baseUrl = opts.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";

  return {
    id: `gemini:${opts.model}`,
    // A requisição inteira pode ter até 20 MB; o base64 aumenta o arquivo em ~33%.
    capabilities: {
      mimeTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      maxBytes: 14_000_000,
    },

    async extract(doc: DocumentInput, signal: AbortSignal): Promise<unknown> {
      const generationConfig: Record<string, unknown> = {
        responseMimeType: "application/json",
        responseJsonSchema: providerJsonSchema,
        maxOutputTokens: opts.maxOutputTokens ?? 2000,
      };
      if (opts.thinkingLevel) generationConfig.thinkingConfig = { thinkingLevel: opts.thinkingLevel };

      const res = await doFetch(`${baseUrl}/models/${opts.model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": opts.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [
                { inlineData: { mimeType: doc.mimeType, data: toBase64(doc.data) } },
                { text: USER_INSTRUCTION },
              ],
            },
          ],
          generationConfig,
        }),
        signal,
      });

      if (!res.ok) {
        const { message, body } = await readErrorMessage(res);
        const retryMs = parseRetryAfterMs(res.headers.get("retry-after")) ?? retryDelayFromBody(body);
        throw errorFromStatus(res.status, message, retryMs);
      }

      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
      };
      // Ignora os resumos de raciocínio (thought: true); só o texto final importa.
      const text = (json.candidates?.[0]?.content?.parts ?? [])
        .filter((p) => !p.thought && typeof p.text === "string")
        .map((p) => p.text)
        .join("");
      return parseModelJson(text);
    },
  };
}

/** O Gemini pode sugerir a espera em error.details[].retryDelay, como "30s". */
function retryDelayFromBody(body: unknown): number | undefined {
  const details = (body as { error?: { details?: unknown } } | null)?.error?.details;
  if (!Array.isArray(details)) return undefined;
  for (const d of details) {
    const delay = (d as { retryDelay?: unknown }).retryDelay;
    if (typeof delay === "string") {
      const m = /^(\d+(?:\.\d+)?)s$/.exec(delay);
      if (m) return Math.min(Number(m[1]) * 1000, 3_600_000);
    }
  }
  return undefined;
}
