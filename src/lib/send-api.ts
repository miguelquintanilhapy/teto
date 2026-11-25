import { ACCESS_KEY_DROPPED_NOTE } from "@/core/documents";
import type { ReviewValues } from "./send";

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);

const DOC_TYPES = ["nota_fiscal", "recibo", "comprovante_pix", "outro"] as const;

/** Resposta de POST /api/documents, reduzida ao que a tela usa. */
export type UploadOutcome =
  | { kind: "review"; values: ReviewValues; duplicate: boolean; issues: string[]; lowTrust: boolean; keyDropped: boolean }
  | { kind: "manual"; documentId: string | null; reason: string }
  | { kind: "error"; message: string };

const GENERIC = "Não foi possível processar o arquivo agora. Tente de novo.";

/**
 * Lê a resposta do servidor sem confiar no formato: qualquer campo fora do esperado
 * vira um campo vazio para o usuário preencher, e nunca quebra a tela.
 */
export function readUploadResponse(httpStatus: number, body: unknown): UploadOutcome {
  if (!isObject(body)) return { kind: "error", message: GENERIC };

  if (httpStatus >= 400 || typeof body.error === "string") {
    return { kind: "error", message: str(body.message) ?? GENERIC };
  }

  const document = isObject(body.document) ? body.document : null;
  const documentId = str(document?.id);

  if (body.status === "manual_entry") {
    return { kind: "manual", documentId, reason: str(body.reason) ?? "unreadable" };
  }
  if (body.status !== "extracted" && body.status !== "duplicate") {
    return { kind: "error", message: GENERIC };
  }

  const extraction = isObject(body.extraction) ? body.extraction : null;
  const data = isObject(extraction?.data) ? extraction.data : {};
  const documentType = DOC_TYPES.find((t) => t === data.documentType) ?? null;
  const confidence = typeof data.confidence === "number" ? data.confidence : null;
  const total = typeof data.totalCents === "number" && Number.isFinite(data.totalCents) ? Math.trunc(data.totalCents) : 0;
  const allIssues = Array.isArray(body.issues) ? body.issues.filter((i): i is string => typeof i === "string") : [];
  // O aviso de chave descartada não é dúvida da IA sobre valor e data: tem aviso próprio.
  const keyDropped = allIssues.includes(ACCESS_KEY_DROPPED_NOTE);
  const issues = allIssues.filter((i) => i !== ACCESS_KEY_DROPPED_NOTE);

  return {
    kind: "review",
    duplicate: body.status === "duplicate",
    issues,
    lowTrust: confidence === null || confidence < 0.75 || issues.length > 0,
    keyDropped,
    values: {
      documentId,
      documentType,
      amountCents: Math.max(0, total),
      date: str(data.issueDate) ?? "",
      description: str(data.description) ?? "",
      issuerTaxId: str(data.issuerTaxId),
      recipientTaxId: str(data.recipientTaxId),
      accessKey: str(data.accessKey),
      confidence,
    },
  };
}

export type ConfirmOutcome =
  | { kind: "created" }
  | { kind: "duplicate" }
  | { kind: "error"; message: string };

/** Resposta de POST /api/transactions. */
export function readConfirmResponse(httpStatus: number, body: unknown): ConfirmOutcome {
  if (isObject(body) && body.status === "created") return { kind: "created" };
  if (isObject(body) && body.status === "duplicate") return { kind: "duplicate" };
  const message = isObject(body) ? str(body.message) : null;
  return { kind: "error", message: message ?? (httpStatus >= 500 ? "Não foi possível salvar agora. Tente de novo." : "Os dados não foram aceitos. Confira e tente de novo.") };
}
