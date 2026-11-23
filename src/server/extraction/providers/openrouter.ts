import { errorFromStatus, parseModelJson, parseRetryAfterMs, readErrorMessage, toBase64, type FetchLike } from "../http";
import { SYSTEM_PROMPT, USER_INSTRUCTION } from "../prompt";
import type { DocumentInput, VisionProvider } from "../provider";
import { providerJsonSchema } from "../schema";

export interface OpenRouterOptions {
  apiKey: string;
  /** Ex.: nvidia/nemotron-3.5-super-vl:free */
  model: string;
  fetch?: FetchLike;
  baseUrl?: string;
  /** Desliga o raciocínio: extrair campos de uma nota não precisa, e só atrasa. */
  disableReasoning?: boolean;
  maxTokens?: number;
  /** Identificação opcional do app no OpenRouter. */
  referer?: string;
  title?: string;
}

/**
 * Adaptador do OpenRouter (chat/completions). Só aceita imagens: o repasse de
 * PDF depende do modelo e não está garantido; PDF vai para o Gemini.
 */
export function createOpenRouterProvider(opts: OpenRouterOptions): VisionProvider {
  const doFetch = opts.fetch ?? fetch;
  const baseUrl = opts.baseUrl ?? "https://openrouter.ai/api/v1";

  return {
    id: `openrouter:${opts.model}`,
    capabilities: { mimeTypes: ["image/jpeg", "image/png", "image/webp"], maxBytes: 10_000_000 },

    async extract(doc: DocumentInput, signal: AbortSignal): Promise<unknown> {
      const body: Record<string, unknown> = {
        model: opts.model,
        temperature: 0,
        max_tokens: opts.maxTokens ?? 1500,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: USER_INSTRUCTION },
              { type: "image_url", image_url: { url: `data:${doc.mimeType};base64,${toBase64(doc.data)}` } },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "extracted_receipt", strict: true, schema: providerJsonSchema },
        },
      };
      if (opts.disableReasoning ?? true) body.reasoning = { enabled: false };

      const headers: Record<string, string> = {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      };
      if (opts.referer) headers["HTTP-Referer"] = opts.referer;
      if (opts.title) headers["X-Title"] = opts.title;

      const res = await doFetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal,
      });

      if (!res.ok) {
        const { message } = await readErrorMessage(res);
        throw errorFromStatus(res.status, message, parseRetryAfterMs(res.headers.get("retry-after")));
      }

      const json = (await res.json()) as {
        error?: { code?: number; message?: string };
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      // O OpenRouter pode devolver HTTP 200 com um erro do provedor no corpo.
      if (json.error) {
        throw errorFromStatus(Number(json.error.code) || 502, json.error.message ?? "erro do provedor");
      }
      return parseModelJson(json.choices?.[0]?.message?.content);
    },
  };
}
