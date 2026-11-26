import { sha256 } from "@/server/hash";
import { validateUpload } from "@/server/upload/validate";
import { PROMPT_VERSION } from "./prompt";
import type { DocumentInput } from "./provider";
import { QuotaExceededError } from "./quota";
import { AllProvidersFailedError, type Attempt, type ExtractionResult } from "./router";
import { SCHEMA_VERSION, type ExtractedReceipt } from "./schema";

// ---------------------------------------------------------------- tipos e portas
export type DocumentKind = "nota" | "recibo" | "extrato";

export interface DocumentRecord {
  id: string;
  profileId: string;
  storagePath: string;
  contentHash: string;
  mimeType: string;
  sizeBytes: number;
  kind: DocumentKind;
}

export type NewDocument = Omit<DocumentRecord, "id">;

export interface ExtractionRecord {
  id: string;
  documentId: string;
  status: "accepted" | "needs_review" | "failed";
  providerId: string | null;
  promptVersion: string;
  schemaVersion: string;
  /** Rastro de cada tentativa: provedor, resultado, latência e problemas encontrados. */
  attempts: Attempt[];
  /** Saída validada do modelo (null se todos falharam). */
  rawResult: ExtractedReceipt | null;
}

export type NewExtraction = Omit<ExtractionRecord, "id">;

/** Lançado pelo repositório quando (perfil, hash) já existe: upload concorrente do mesmo arquivo. */
export class DuplicateDocumentError extends Error {
  constructor() {
    super("documento duplicado");
    this.name = "DuplicateDocumentError";
  }
}

export interface DocumentsRepo {
  findByHash(profileId: string, contentHash: string): Promise<DocumentRecord | null>;
  insert(doc: NewDocument): Promise<DocumentRecord>;
  /** Quantos documentos novos o perfil enviou desde `sinceIso`. */
  countSince(profileId: string, sinceIso: string): Promise<number>;
}

export interface ExtractionsRepo {
  findByDocumentId(documentId: string): Promise<ExtractionRecord | null>;
  /** Cria ou substitui a extração do documento (uma por documento). */
  save(extraction: NewExtraction): Promise<ExtractionRecord>;
}

export interface FileStorage {
  /** Idempotente: gravar o mesmo caminho de novo não é erro. */
  put(path: string, bytes: Uint8Array, mimeType: string): Promise<void>;
}

export interface ProfileRecord {
  id: string;
  name: string;
  /** CNPJ do MEI, só dígitos. Serve para decidir se um documento é receita ou despesa. */
  taxId: string;
  /** Data de abertura (YYYY-MM-DD): define o limite proporcional no ano de abertura. */
  openingDate: string;
  /** Recebe os alertas do limite. */
  email: string;
}

export interface ProfilesRepo {
  /** Perfil único da demonstração; null se ainda não foi criado (npm run seed). */
  getDemoProfileId(): Promise<string | null>;
  getDemoProfile(): Promise<ProfileRecord | null>;
  /** Cria o perfil único da demonstração ou atualiza o que já existe. */
  saveDemoProfile(input: Omit<ProfileRecord, "id">): Promise<ProfileRecord>;
}

export interface Extractor {
  extract(doc: DocumentInput): Promise<ExtractionResult>;
}

export interface UploadDeps {
  documents: DocumentsRepo;
  extractions: ExtractionsRepo;
  storage: FileStorage;
  extractor: Extractor;
  maxBytes?: number;
  /** Teto de documentos NOVOS por janela. Sem login, isto impede encher o storage e gastar a cota de IA. */
  throttle?: { max: number; windowMs: number };
  now?: () => number;
}

export interface UploadInput {
  profileId: string;
  bytes: Uint8Array;
  kind: DocumentKind;
}

export type UploadOutcome =
  | { status: "rejected"; code: "empty" | "too_large" | "unsupported_type" | "rate_limited"; message: string }
  /** Arquivo já enviado antes e já extraído: devolve o que existe, sem gastar cota de IA. */
  | { status: "duplicate"; document: DocumentRecord; extraction: ExtractionRecord }
  | { status: "extracted"; document: DocumentRecord; extraction: ExtractionRecord; issues: string[] }
  /** A IA não pôde ler (cota do dia ou todos os modelos falharam): o usuário preenche à mão. */
  | {
      status: "manual_entry";
      reason: "quota_exceeded" | "all_providers_failed";
      document: DocumentRecord;
      extraction: ExtractionRecord | null;
    };

// ---------------------------------------------------------------------- caso de uso
/**
 * Recebe um arquivo, guarda, extrai com a cadeia de modelos e registra o rastro.
 * É idempotente pelo hash do conteúdo: o mesmo arquivo nunca é lido duas vezes.
 */
const DEFAULT_THROTTLE = { max: 30, windowMs: 10 * 60_000 } as const;

export async function processUpload(input: UploadInput, deps: UploadDeps): Promise<UploadOutcome> {
  const check = validateUpload(input.bytes, deps.maxBytes);
  if (!check.ok) return { status: "rejected", code: check.code, message: check.message };

  const hash = sha256(input.bytes);
  const { max, windowMs } = deps.throttle ?? DEFAULT_THROTTLE;
  const since = new Date((deps.now ?? Date.now)() - windowMs).toISOString();

  // As duas consultas são independentes: juntas custam uma ida e volta ao banco, e não duas.
  const [found, recent] = await Promise.all([
    deps.documents.findByHash(input.profileId, hash),
    deps.documents.countSince(input.profileId, since),
  ]);

  let document = found;
  if (document) {
    const existing = await deps.extractions.findByDocumentId(document.id);
    if (existing && existing.status !== "failed") return { status: "duplicate", document, extraction: existing };
    // Sem extração, ou a anterior falhou: tenta de novo sobre o mesmo documento.
  } else if (recent >= max) {
    return { status: "rejected", code: "rate_limited", message: "Muitos envios em pouco tempo. Tente de novo em alguns minutos." };
  }

  // A IA só precisa dos bytes. Gravar o arquivo e o registro leva 1 a 2 s, e antes isso esperava a leitura
  // começar: agora os dois andam juntos. Se a gravação falhar, a leitura já feita se perde (e gasta cota);
  // é raro e preferível a deixar todo envio mais lento.
  const persisting = document ? null : persistNewDocument(input, hash, check, deps);
  const extracting = deps.extractor
    .extract({ mimeType: check.mimeType, data: input.bytes })
    .then(
      (result) => ({ result }),
      (error: unknown) => ({ error }),
    ); // nunca rejeita: o erro é tratado abaixo, depois que o documento existir

  if (persisting) document = await persisting;
  if (!document) throw new Error("documento ausente");
  const doc = document;

  const outcome = await extracting;
  if ("result" in outcome) {
    const result = outcome.result;
    const extraction = await deps.extractions.save({
      documentId: doc.id,
      status: result.status,
      providerId: result.providerId,
      promptVersion: PROMPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      attempts: result.attempts,
      rawResult: result.data,
    });
    return { status: "extracted", document: doc, extraction, issues: result.issues };
  }

  const e = outcome.error;
  if (e instanceof QuotaExceededError) {
    return { status: "manual_entry", reason: "quota_exceeded", document: doc, extraction: null };
  }
  if (e instanceof AllProvidersFailedError) {
    const extraction = await deps.extractions.save({
      documentId: doc.id,
      status: "failed",
      providerId: null,
      promptVersion: PROMPT_VERSION,
      schemaVersion: SCHEMA_VERSION,
      attempts: e.attempts,
      rawResult: null,
    });
    return { status: "manual_entry", reason: "all_providers_failed", document: doc, extraction };
  }
  throw e;
}

/** Guarda o arquivo no storage e cria o registro. Se outro envio do mesmo arquivo chegou primeiro, usa o dele. */
async function persistNewDocument(
  input: UploadInput,
  hash: string,
  check: { extension: string; mimeType: string },
  deps: UploadDeps,
): Promise<DocumentRecord> {
  const storagePath = `${input.profileId}/${hash}.${check.extension}`;
  await deps.storage.put(storagePath, input.bytes, check.mimeType);
  const row: NewDocument = {
    profileId: input.profileId,
    storagePath,
    contentHash: hash,
    mimeType: check.mimeType,
    sizeBytes: input.bytes.byteLength,
    kind: input.kind,
  };
  try {
    return await deps.documents.insert(row);
  } catch (e) {
    if (!(e instanceof DuplicateDocumentError)) throw e;
    const existing = await deps.documents.findByHash(input.profileId, hash);
    if (!existing) throw e;
    return existing;
  }
}
