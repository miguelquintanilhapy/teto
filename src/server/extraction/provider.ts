/** Porta (interface) que todo provedor de visão precisa implementar. */
export interface DocumentInput {
  mimeType: string;
  data: Uint8Array;
}

export interface VisionProvider {
  /** Identificador estável, usado em logs, métricas e cooldown. */
  readonly id: string;
  /** Devolve o JSON já decodificado; a validação é responsabilidade do roteador. */
  extract(doc: DocumentInput, signal: AbortSignal): Promise<unknown>;
}

export type ProviderErrorKind = "rate_limit" | "timeout" | "unavailable" | "bad_request";

export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
    /** Sugestão do provedor de quanto esperar (ex.: cabeçalho Retry-After). */
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
