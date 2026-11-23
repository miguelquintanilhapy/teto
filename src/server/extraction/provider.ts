/** Porta (interface) que todo provedor de visão precisa implementar. */
export interface DocumentInput {
  mimeType: string;
  data: Uint8Array;
}

/** O que o provedor consegue processar. O roteador pula quem não serve. */
export interface ProviderCapabilities {
  mimeTypes: ReadonlyArray<string>;
  maxBytes: number;
}

export interface VisionProvider {
  /** Identificador estável, usado em logs, métricas e cooldown. */
  readonly id: string;
  /** Se ausente, o provedor aceita qualquer documento. */
  readonly capabilities?: ProviderCapabilities;
  /** Devolve o JSON já decodificado; a validação é responsabilidade do roteador. */
  extract(doc: DocumentInput, signal: AbortSignal): Promise<unknown>;
}

export function canHandle(provider: VisionProvider, doc: DocumentInput): boolean {
  const caps = provider.capabilities;
  if (!caps) return true;
  return caps.mimeTypes.includes(doc.mimeType) && doc.data.byteLength <= caps.maxBytes;
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
